import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tauriSupabase, tauriUtils } from '../tauriClient';

function CreateProject() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  
  console.log('Debug - CreateProject component - user:', user); // Debug log
  console.log('Debug - CreateProject component - accessToken:', accessToken); // Debug log
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    folder_path: '',
    roster_type: 'file', // 'file' or 'url'
    roster_data: '',
    metadata_config: {}
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  // Folder selection state
  const [folderInfo, setFolderInfo] = useState(null);
  const [selectingFolder, setSelectingFolder] = useState(false);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific errors
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle roster type toggle
  const handleRosterTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      roster_type: type,
      roster_data: '' // Clear roster data when switching types
    }));
    
    // Clear roster-related errors
    if (errors.roster_data) {
      setErrors(prev => ({
        ...prev,
        roster_data: ''
      }));
    }
  };

  // Select folder using Tauri dialog
  const handleSelectFolder = async () => {
    setSelectingFolder(true);
    setErrors(prev => ({ ...prev, folder_path: '' }));
    
    try {
      const { data, error } = await tauriUtils.selectFolderWithInfo();
      
      if (error) {
        setErrors(prev => ({ ...prev, folder_path: error.message }));
        return;
      }
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          folder_path: data.path
        }));
        setFolderInfo(data);
        setSuccess('Folder selected successfully!');
      }
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        folder_path: 'Failed to select folder. Please try again.' 
      }));
    } finally {
      setSelectingFolder(false);
    }
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.folder_path) {
      newErrors.folder_path = 'Please select a project folder';
    }

    // Roster data validation
    if (formData.roster_type === 'url' && formData.roster_data) {
      try {
        const url = new URL(formData.roster_data);
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.roster_data = 'URL must use HTTP or HTTPS protocol';
        }
      } catch {
        newErrors.roster_data = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if user is authenticated
    if (!user || !accessToken) {
      setErrors(prev => ({ 
        ...prev, 
        general: 'You must be signed in to create a project. Please sign in first.' 
      }));
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccess('');

    try {
      // Prepare project data
      const projectData = {
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || 'New project',
        folder_path: formData.folder_path,
        roster_type: formData.roster_type,
        roster_data: formData.roster_data || null,
        metadata_config: formData.metadata_config,
        image_url: 'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg'
      };

      // Create project using Tauri backend
      console.log('Debug - accessToken:', accessToken); // Debug log
      console.log('Debug - projectData:', projectData); // Debug log
      
      if (!accessToken) {
        throw new Error('Access token is missing. Please sign in again.');
      }
      
      const { data, error } = await tauriSupabase
        .from('projects')
        .insert([projectData], accessToken);

      if (error) {
        throw new Error(error.message || 'Failed to create project');
      }

      if (data && data[0]) {
        setSuccess('Project created successfully!');
        
        // Navigate to the new project after a short delay
        setTimeout(() => {
          navigate(`/project/${data[0].id}`);
        }, 1500);
      }
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        general: error.message || 'Failed to create project. Please try again.' 
      }));
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="create-project-container">
      <div className="create-project-header">
        <h1>Create New Project</h1>
        <p>Set up a new photo organization project with custom tagging parameters</p>
      </div>

      <form onSubmit={handleSubmit} className="create-project-form">
        {/* General Information */}
        <div className="form-section">
          <h2>Project Information</h2>
          
          <div className="form-group">
            <label htmlFor="name">Project Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter project name"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your project (optional)"
              rows="3"
            />
          </div>
        </div>

        {/* Folder Selection */}
        <div className="form-section">
          <h2>Project Folder</h2>
          
          <div className="form-group">
            <label>Project Folder *</label>
            <div className="folder-selection">
              <button
                type="button"
                onClick={handleSelectFolder}
                disabled={selectingFolder}
                className="btn btn-secondary folder-picker-btn"
              >
                {selectingFolder ? 'Selecting...' : 'Select Folder'}
              </button>
              
              {formData.folder_path && (
                <div className="selected-folder">
                  <span className="folder-icon">📁</span>
                  <span className="folder-path">{formData.folder_path}</span>
                </div>
              )}
            </div>
            {errors.folder_path && <span className="error-message">{errors.folder_path}</span>}
            
            {folderInfo && (
              <div className="folder-info">
                <div className="info-item">
                  <span className="info-label">Permissions:</span>
                  <span className={`info-value ${folderInfo.can_write ? 'success' : 'error'}`}>
                    {folderInfo.can_write ? '✅ Writable' : '❌ Read-only'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Type:</span>
                  <span className="info-value">
                    {folderInfo.is_directory ? '📁 Directory' : '📄 File'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Roster Configuration */}
        <div className="form-section">
          <h2>Team Roster</h2>
          
          <div className="form-group">
            <label>Roster Type</label>
            <div className="roster-type-toggle">
              <button
                type="button"
                onClick={() => handleRosterTypeChange('file')}
                className={`toggle-btn ${formData.roster_type === 'file' ? 'active' : ''}`}
              >
                📁 File Upload
              </button>
              <button
                type="button"
                onClick={() => handleRosterTypeChange('url')}
                className={`toggle-btn ${formData.roster_type === 'url' ? 'active' : ''}`}
              >
                🌐 URL Input
              </button>
            </div>
          </div>

          {formData.roster_type === 'file' && (
            <div className="form-group">
              <label>Roster File</label>
              <div className="file-upload-placeholder">
                <span className="file-icon">📄</span>
                <span className="file-text">
                  File upload will be implemented in the next phase
                </span>
              </div>
            </div>
          )}

          {formData.roster_type === 'url' && (
            <div className="form-group">
              <label htmlFor="roster_data">Roster URL</label>
              <input
                type="url"
                id="roster_data"
                name="roster_data"
                value={formData.roster_data}
                onChange={handleInputChange}
                placeholder="https://example.com/roster.csv"
                className={errors.roster_data ? 'error' : ''}
              />
              {errors.roster_data && <span className="error-message">{errors.roster_data}</span>}
              
              {formData.roster_data && (
                <div className="url-preview">
                  <span className="url-icon">🔗</span>
                  <span className="url-text">{formData.roster_data}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="error-banner">
            <div className="error-icon">⚠️</div>
            <span>{errors.general}</span>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="success-banner">
            <div className="success-icon">✅</div>
            <span>{success}</span>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating Project...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateProject;
