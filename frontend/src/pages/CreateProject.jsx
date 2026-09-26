import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tauriUtils } from '../tauriClient';

const IMAGE_URL = 'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg';

function CreateProject() {
  const navigate = useNavigate();
  const { user, isDevelopment, createMockProject, accessToken } = useAuth();

  const [rosters, setRosters] = useState([]);
  const [rosterId, setRosterId] = useState('');
  const [folderInfo, setFolderInfo] = useState(null);
  const [selectingFolder, setSelectingFolder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // null until the user edits the name; until then it follows the roster
  const [customName, setCustomName] = useState(null);

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        setRosters(await invoke('list_rosters', { userId: user.id, accessToken }));
      } catch (err) {
        setError(`Failed to load rosters: ${err}`);
      }
    })();
  }, [accessToken, user]);

  const roster = rosters.find((r) => r.id === rosterId);
  // Local date as YYYY-MM-DD
  const defaultName = roster ? `${new Date().toLocaleDateString('en-CA')} ${roster.name}` : '';
  const projectName = customName ?? defaultName;

  const handleSelectFolder = async () => {
    setSelectingFolder(true);
    setError('');
    try {
      const { data, error } = await tauriUtils.selectFolderWithInfo();
      if (error && !String(error.message).includes('No folder selected')) setError(String(error.message));
      else if (data) setFolderInfo(data);
    } finally {
      setSelectingFolder(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderInfo || !roster || !projectName.trim()) return;
    setLoading(true);
    setError('');

    const project = {
      user_id: user.id,
      name: projectName.trim(),
      description: 'New project',
      image_url: IMAGE_URL,
      folder_path: folderInfo.path,
      // The project's roster; Photo Tagging preselects it
      roster_type: 'file',
      roster_data: roster.id,
      sport_type: roster.sport,
      team_classification: null,
    };

    try {
      let created;
      if (isDevelopment) {
        const result = await createMockProject(project);
        if (result.error) throw new Error(result.error.message);
        created = Array.isArray(result.data) ? result.data[0] : result.data;
      } else {
        const { invoke } = await import('@tauri-apps/api/core');
        created = await invoke('create_project', { project, accessToken });
      }
      navigate(created?.id ? `/project/${created.id}` : '/dashboard?refresh=true');
    } catch (err) {
      setError(`Failed to create project: ${err.message || err}`);
      setLoading(false);
    }
  };

  return (
    <div className="create-project-container">
      <div className="create-project-header">
        <h1>Create New Project</h1>
        <p>Choose a photo folder and a roster</p>
      </div>

      <form onSubmit={handleSubmit} className="create-project-form">
        <div className="form-section">
          <h2>Project Folder *</h2>
          <div className="form-group">
            <div className="folder-selection">
              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={selectingFolder}
                className="btn btn-secondary folder-picker-btn"
              >
                {selectingFolder ? 'Selecting...' : 'Select Folder'}
              </button>
              {folderInfo && (
                <div className="selected-folder">
                  <span className="folder-icon">📁</span>
                  <span className="folder-path">{folderInfo.path}</span>
                </div>
              )}
            </div>
            {folderInfo && !folderInfo.can_write && (
              <span className="error-message">❌ This folder is read-only; tags can't be saved to it.</span>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Roster *</h2>
          <div className="form-group">
            <select value={rosterId} onChange={(e) => setRosterId(e.target.value)}>
              <option value="">Select Roster</option>
              {rosters.map((r) => (
                <option key={r.id} value={r.id}>{r.name} — {r.sport} {r.season}</option>
              ))}
            </select>
            {rosters.length === 0 && (
              <small className="help-text">
                No rosters yet.{' '}
                <button type="button" className="btn btn-outline" onClick={() => navigate('/rosters')}>
                  📋 Upload a roster
                </button>
              </small>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Project Name *</h2>
          <div className="form-group">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Today's date + roster name"
            />
            {customName !== null && customName !== defaultName && defaultName && (
              <small className="help-text">
                <button type="button" className="btn btn-outline" onClick={() => setCustomName(null)}>
                  Reset to "{defaultName}"
                </button>
              </small>
            )}
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <div className="error-icon">⚠️</div>
            <span>{error}</span>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !folderInfo || !roster || !projectName.trim()}>
            {loading ? 'Creating Project...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateProject;
