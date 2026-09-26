import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AutoTagger({ projectId, projectData }) {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [rosters, setRosters] = useState([]);

  // ── Photo processing state ────────────────────────────────────────────────
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [photoResults, setPhotoResults] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');
  // Projects created with a roster store its id in roster_data
  const [selectedRosterId, setSelectedRosterId] = useState(projectData?.roster_type === 'file' ? projectData.roster_data || '' : '');
  // Folder is chosen in the Photos section of the project page
  const folderPath = projectData?.folder_path || '';
  const [progress, setProgress] = useState(null);
  // Remembered per project, since home/away colors differ game to game
  const colorKey = `jerseyColor:${projectId}`;
  const [jerseyColor, setJerseyColor] = useState(() => {
    try { return localStorage.getItem(colorKey) || ''; } catch { return ''; }
  });
  useEffect(() => {
    try { localStorage.setItem(colorKey, jerseyColor); } catch { /* storage unavailable */ }
  }, [colorKey, jerseyColor]);

  useEffect(() => {
    if (accessToken && projectData?.user_id) {
      loadRosters();
    }
  }, [accessToken, projectData]);

  const loadRosters = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      setRosters(await invoke('list_rosters', { userId: projectData.user_id, accessToken }));
    } catch (error) {
      console.error('Failed to load rosters:', error);
    }
  };

  // ── Photo processing handler ──────────────────────────────────────────────
  const handleProcessPhotos = async () => {
    setProcessingPhotos(true);
    setPhotoError('');
    setPhotoSuccess('');
    setPhotoResults([]);
    setProgress(null);

    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen('tag-progress', (event) => setProgress(event.payload));

    try {
      const results = await invoke('process_photo_folder', {
        rosterId: selectedRosterId,
        jerseyColor: jerseyColor.trim(),
        folderPath,
        accessToken,
      });

      setPhotoResults(results);
      const updated = results.filter((r) => r.xmp_updated).length;
      const failed = results.filter((r) => r.error).length;
      setPhotoSuccess(
        `Processed ${results.length} RAW photos: ${updated} tagged` +
        (failed ? `, ${failed} failed` : '')
      );
    } catch (error) {
      setPhotoError(`Failed to process photos: ${error}`);
    } finally {
      unlisten();
      setProgress(null);
      setProcessingPhotos(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Roster Section ── */}
      <div className="tagger-section">
        <h3>📋 Roster Management</h3>
        <p>Rosters are shared across all your projects. Upload and name them on the Rosters page.</p>
        <button className="btn btn-primary" onClick={() => navigate('/rosters')}>
          📋 Manage Rosters
        </button>
      </div>

      {/* ── Photo Processing Section ── */}
      <div className="tagger-section">
        <h3>📸 Photo Tagging</h3>
        <p>
          Detects jersey numbers in the RAW photos of a folder and adds matching player names to each
          photo's .xmp description. Only players wearing your team's jersey color are tagged. Numbers
          read with less than 75% confidence are skipped, as are JPEGs.
        </p>

        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
          <label style={{ fontSize: '0.9em', fontWeight: 'bold' }}>Roster:</label>
          <select
            value={selectedRosterId}
            onChange={(e) => setSelectedRosterId(e.target.value)}
            className="form-select"
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
          >
            <option value="">Select Roster</option>
            {rosters.map((r) => (
              <option key={r.id} value={r.id}>{r.name} — {r.sport} {r.season}</option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
          <label htmlFor="jersey-color" style={{ fontSize: '0.9em', fontWeight: 'bold' }}>Our jersey color:</label>
          <input
            id="jersey-color"
            type="text"
            value={jerseyColor}
            onChange={(e) => setJerseyColor(e.target.value)}
            placeholder="e.g. white with navy numbers"
            disabled={processingPhotos}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
          />
        </div>

        {!folderPath && (
          <div className="warning-message">
            <span className="warning-icon">💡</span>
            <span>Select a folder in the Photos section below first.</span>
          </div>
        )}

        {rosters.length === 0 && (
          <div className="warning-message">
            <span className="warning-icon">💡</span>
            <span>Upload a roster PDF first so jersey numbers can be matched to players.</span>
          </div>
        )}

        <button
          className="btn btn-primary process-photos-btn"
          onClick={handleProcessPhotos}
          disabled={processingPhotos || !folderPath || !jerseyColor.trim() || !rosters.some((r) => r.id === selectedRosterId)}
        >
          {processingPhotos ? '⏳ Tagging Photos…' : '🏷️ Tag Photos'}
        </button>

        {progress && progress.total > 0 && (
          <div className="parsing-progress">
            <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(progress.done / progress.total) * 100}%`, background: '#3b82f6', transition: 'width 0.3s' }} />
            </div>
            <p className="progress-label">
              {progress.done} / {progress.total}{progress.fileName ? ` — ${progress.fileName}` : ''}
            </p>
          </div>
        )}

        {photoError && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{photoError}</span>
            <button className="clear-btn" onClick={() => setPhotoError('')}>✕</button>
          </div>
        )}

        {photoSuccess && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            <span>{photoSuccess}</span>
          </div>
        )}

        {photoResults.length > 0 && (
          <div className="photo-results">
            <h4>📸 Results</h4>
            <div className="results-details" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {photoResults.map((photo) => {
                const ignored = photo.detected_numbers.filter(
                  (d) => !(d.our_team && d.confidence >= 75 && photo.matched_players.some((p) => p.jersey_number === d.number))
                );
                return (
                  <div key={photo.file_path} className="photo-result-item" style={{ marginBottom: '12px' }}>
                    <div className="photo-info">
                      <span className="photo-name">{photo.file_name}</span>
                      <span>
                        {photo.error ? '❌' : photo.xmp_updated ? '✅ tagged' : photo.description ? '⏭️ already tagged' : '— no match'}
                      </span>
                    </div>
                    {photo.matched_players.length > 0 && (
                      <div className="detected-players">
                        {photo.matched_players.map((p, i) => (
                          <span key={i} className="player-tag">
                            {p.name}{p.jersey_number != null ? ` #${p.jersey_number}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    {ignored.length > 0 && (
                      <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                        Not tagged: {ignored.map((d) => (
                          `#${d.number} (${Math.round(d.confidence)}%${!d.our_team ? ' — other team' : d.confidence < 75 ? ' — too unsure' : ' — not on roster'})`
                        )).join(', ')}
                      </div>
                    )}
                    {photo.error && (
                      <div style={{ fontSize: '0.85em', color: '#dc2626' }}>{photo.error}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default AutoTagger;
