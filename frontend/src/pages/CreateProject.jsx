import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tauriSupabase, tauriUtils } from '../tauriClient';

function CreateProject() {
  const navigate = useNavigate();
  const { user, isDevelopment, createMockProject, accessToken } = useAuth()

  console.log('Debug - CreateProject component - user:', user); // Debug log
  console.log('Debug - CreateProject component - accessToken:', accessToken); // Debug log

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    folder_path: '',
    roster_type: 'url', // 'url' or 'file'
    roster_data: '',
    sport_type: '',
    team_classification: 'other', // 'university', 'professional', 'amateur', 'other'
    metadata_config: {
      tags: [],
      categories: [],
      custom_fields: []
    }
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    folder_path: '',
    roster_data: '',
    general: ''
  })
  const [success, setSuccess] = useState('');

  // Folder selection state
  const [folderInfo, setFolderInfo] = useState(null);
  const [selectingFolder, setSelectingFolder] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle roster type change
  const handleRosterTypeChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      roster_type: value,
      roster_data: '' // Clear roster data when type changes
    }));

    // Clear roster data errors
    if (errors.roster_data) {
      setErrors(prev => ({
        ...prev,
        roster_data: ''
      }));
    }
  };

  // Select folder using Tauri dialog or mock in development
  const handleSelectFolder = async () => {
    setSelectingFolder(true);
    setErrors(prev => ({ ...prev, folder_path: '' }));

    try {
      if (isDevelopment) {
        // Mock folder selection for development
        const mockFolderInfo = {
          path: '/mock/project/folder',
          can_write: true,
          is_directory: true
        };
        setFormData(prev => ({
          ...prev,
          folder_path: mockFolderInfo.path
        }));
        setFolderInfo(mockFolderInfo);
        setSuccess('Mock folder selected for development!');
      } else {
        // Use Tauri folder selection
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

    // Validate required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.folder_path) {
      newErrors.folder_path = 'Project folder is required';
    }

    // Validate folder path format
    if (formData.folder_path && !formData.folder_path.includes('/') && !formData.folder_path.includes('\\')) {
      newErrors.folder_path = 'Please select a valid folder path';
    }

    // Validate roster data if roster type is selected
    if (formData.roster_type === 'url' && formData.roster_data.trim()) {
      try {
        new URL(formData.roster_data);
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
    if (!user || (!accessToken && !isDevelopment)) {
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
      // Prepare project data for backend
      const projectData = {
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || 'New project',
        image_url: 'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg',
        folder_path: formData.folder_path,
        roster_type: formData.roster_type,
        roster_data: formData.roster_data.trim() || null,
        sport_type: formData.sport_type.trim() || null,
        team_classification: formData.team_classification,
        metadata_config: formData.metadata_config
      };

      // Validate project data before sending to backend
      if (!projectData.user_id || !projectData.name || !projectData.folder_path) {
        const missingFields = [];
        if (!projectData.user_id) missingFields.push('user_id');
        if (!projectData.name) missingFields.push('name');
        if (!projectData.folder_path) missingFields.push('folder_path');

        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Ensure user_id is a valid UUID format
      if (typeof projectData.user_id !== 'string' || projectData.user_id.length < 10) {
        throw new Error('Invalid user ID format');
      }

      // Ensure metadata_config is a valid object
      if (projectData.metadata_config && typeof projectData.metadata_config !== 'object') {
        throw new Error('Invalid metadata config format');
      }

      let result;

      if (isDevelopment) {
        // Use mock project creation in development mode
        result = await createMockProject(projectData);
      } else {
        // Use Tauri backend to create project
        console.log('Debug - accessToken:', accessToken); // Debug log
        console.log('Debug - projectData:', projectData); // Debug log

        if (!accessToken) {
          throw new Error('Access token is missing. Please sign in again.');
        }

        // Create the project data structure that matches CreateProjectRequest
        const projectForBackend = {
          user_id: user.id,
          name: formData.name.trim(),
          description: formData.description.trim() || 'New project',
          image_url: 'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg',
          folder_path: formData.folder_path,
          roster_type: formData.roster_type,
          roster_data: formData.roster_data.trim() || null,
          sport_type: formData.sport_type.trim() || null,
          team_classification: formData.team_classification
        };

        console.log('Debug - projectForBackend:', projectForBackend); // Debug log

        try {
          // Use the Tauri invoke command directly instead of tauriSupabase
          const { invoke } = await import('@tauri-apps/api/core');
          const createdProject = await invoke('create_project', {
            project: projectForBackend,
            accessToken
          });

          console.log('Debug - Tauri create_project result:', createdProject); // Debug log
          result = { data: [createdProject], error: null };
        } catch (invokeError) {
          console.error('Debug - Tauri invoke error:', invokeError); // Debug log
          throw new Error(`Backend project creation failed: ${invokeError}`);
        }
      }

      if (result.error) {
        throw new Error(result.error.message || 'Failed to create project');
      }

      console.log('Project creation result:', result); // Debug log

      if (result.data && result.data[0]) {
        const createdProject = result.data[0];
        console.log('Created project:', createdProject); // Debug log

        if (createdProject.id) {
          setSuccess('Project created successfully!');
          // Navigate to the project page after a short delay
          setTimeout(() => {
            navigate(`/project/${createdProject.id}`);
          }, 1500);
        } else {
          console.warn('Project created but no ID returned:', createdProject);
          setSuccess('Project created successfully! Redirecting to dashboard...');
          setTimeout(() => {
            navigate('/dashboard?refresh=true');
          }, 1500);
        }
      } else if (result.data && !Array.isArray(result.data)) {
        // Handle case where result.data is a single project object
        const createdProject = result.data;
        console.log('Created project (single object):', createdProject); // Debug log

        if (createdProject.id) {
          setSuccess('Project created successfully!');
          setTimeout(() => {
            navigate(`/project/${createdProject.id}`);
          }, 1500);
        } else {
          console.warn('Project created but no ID returned:', createdProject);
          setSuccess('Project created successfully! Redirecting to dashboard...');
          setTimeout(() => {
            navigate('/dashboard?refresh=true');
          }, 1500);
        }
      } else {
        // If no data returned, still show success but navigate to dashboard
        console.warn('No project data returned from creation:', result);
        setSuccess('Project created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard?refresh=true');
        }, 1500);
      }
    } catch (error) {
      console.error('Project creation error:', error); // Debug log

      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('id') && error.message.includes('null value')) {
        errorMessage = 'Database error: ID field is not being auto-generated. This may be a backend configuration issue.';
      } else if (error.message.includes('access token')) {
        errorMessage = 'Authentication error: Please sign in again.';
      } else if (error.message.includes('required fields')) {
        errorMessage = `Validation error: ${error.message}`;
      }

      setErrors(prev => ({
        ...prev,
        general: errorMessage
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
        {isDevelopment && (
          <div className="development-notice">
            🚧 Development Mode - Using Mock Data
          </div>
        )}
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

        {/* Roster Configuration */}
        <div className="form-section">
          <h2>Roster Configuration (Optional)</h2>
          <p className="section-description">
            Add roster information to enable automatic player tagging in photos
          </p>

          <div className="form-group">
            <label htmlFor="roster_type">Roster Type</label>
            <select
              id="roster_type"
              name="roster_type"
              value={formData.roster_type}
              onChange={handleRosterTypeChange}
            >
              {/* <option value="url">URL (Web page)</option> */}
              <option value="file">PDF File Upload</option>
            </select>
          </div>

          {/* {formData.roster_type === 'url' && (
            <div className="form-group">
              <label htmlFor="roster_data">Roster URL</label>
              <input
                type="url"
                id="roster_data"
                name="roster_data"
                value={formData.roster_data}
                onChange={handleInputChange}
                placeholder="https://example.com/team-roster"
                className={errors.roster_data ? 'error' : ''}
              />
              <small className="help-text">
                Enter the URL of a webpage containing team roster information
              </small>
              {errors.roster_data && <span className="error-message">{errors.roster_data}</span>}
            </div>
          )} */}

          {formData.roster_type === 'file' && (
            <div className="form-group">
              <label htmlFor="roster_data">Roster File</label>
              <input
                type="file"
                id="roster_data"
                name="roster_data"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setFormData(prev => ({
                      ...prev,
                      roster_data: file.name
                    }));
                  }
                }}
              />
              <small className="help-text">
                Upload a PDF file containing roster information
              </small>
            </div>
          )}

          {/* Sport and Team Information */}
          <div className="form-group">
            <label htmlFor="sport_type">Sport Type</label>
            <input
              type="text"
              id="sport_type"
              name="sport_type"
              value={formData.sport_type}
              onChange={handleInputChange}
              placeholder="e.g., Basketball, Football, Soccer"
            />
            <small className="help-text">
              The type of sport for this team (will be auto-detected from roster)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="team_classification">Team Classification</label>
            <select
              id="team_classification"
              name="team_classification"
              value={formData.team_classification}
              onChange={handleInputChange}
            >
              <option value="other">Other</option>
              <option value="university">University/College</option>
              <option value="professional">Professional</option>
              <option value="amateur">Amateur/Recreational</option>
            </select>
            <small className="help-text">
              The type of team organization (will be auto-detected from roster URL)
            </small>
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
                {selectingFolder ? 'Selecting...' : (isDevelopment ? 'Select Mock Folder' : 'Select Folder')}
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
