import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProjectEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingRoster, setUploadingRoster] = useState(false)
  
  const { user, isDevelopment, getMockProject, accessToken } = useAuth()

  // Metadata editing state
  const [metadataType, setMetadataType] = useState('description')
  const [informationType, setInformationType] = useState('player_name')
  
  // Roster upload state
  const [rosterType, setRosterType] = useState('file')
  const [rosterFile, setRosterFile] = useState(null)
  const [rosterUrl, setRosterUrl] = useState('')

  useEffect(() => {
    if (id) {
      fetchProject()
    } else {
      setLoading(false)
    }
  }, [id])

  const fetchProject = async () => {
    try {
      console.log('Fetching project for editing with ID:', id, 'Development mode:', isDevelopment, 'User:', user);
      
      if (isDevelopment) {
        if (!user) {
          console.log('No user in development mode');
          setError('User not authenticated')
          setLoading(false)
          return
        }

        const { data, error } = await getMockProject(id)
        console.log('Mock project fetch result:', { data, error });
        
        if (error) {
          console.error('Error fetching mock project:', error)
          setError('Project not found')
        } else {
          setProject(data)
          console.log('Set mock project:', data);
        }
      } else {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const projectData = await invoke('get_project_by_id', { 
            projectId: id, 
            userId: user.id, 
            accessToken: accessToken
          });
          
          console.log('Tauri get_project_by_id result:', projectData);
          
          if (projectData) {
            setProject(projectData);
            console.log('Set Tauri project:', projectData);
          } else {
            setError('Project not found');
          }
        } catch (invokeError) {
          console.error('Tauri invoke error:', invokeError);
          setError('Failed to load project from backend');
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleMetadataEdit = async () => {
    setSaving(true);
    
    try {
      const updatedProject = { ...project };
      
      if (!updatedProject.metadata_config) {
        updatedProject.metadata_config = {};
      }
      
      // Set the metadata configuration based on the selected types
      updatedProject.metadata_config[metadataType] = informationType;
      
      if (isDevelopment) {
        // Mock update - just update local state
        setProject(updatedProject);
        console.log('Mock updated project metadata:', updatedProject);
      } else {
        // Use Tauri backend to update project
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('update_project', { 
          projectId: project.id, 
          project: updatedProject, 
          accessToken 
        });
        
        setProject(updatedProject);
        console.log('Project metadata updated successfully');
      }
    } catch (error) {
      console.error('Error updating metadata:', error);
      alert('Failed to update metadata. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const handleSaveAll = async () => {
    setSaving(true);
    
    try {
      const updatedProject = { ...project };
      
      // Update metadata configuration
      if (!updatedProject.metadata_config) {
        updatedProject.metadata_config = {};
      }
      updatedProject.metadata_config[metadataType] = informationType;
      
      // Update roster configuration
      if (!updatedProject.roster_config) {
        updatedProject.roster_config = {};
      }
      updatedProject.roster_config.type = rosterType;
      if (rosterType === 'file' && rosterFile) {
        updatedProject.roster_config.file_name = rosterFile.name;
        updatedProject.roster_config.file_size = rosterFile.size;
      } else if (rosterType === 'url' && rosterUrl.trim()) {
        updatedProject.roster_config.url = rosterUrl.trim();
      }
      
      if (isDevelopment) {
        // Mock update - just update local state
        setProject(updatedProject);
        console.log('Mock updated project configuration:', updatedProject);
        alert('Configuration saved successfully (mock)');
      } else {
        // Use Tauri backend to update project
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('update_project', { 
          projectId: project.id, 
          project: updatedProject, 
          accessToken 
        });
        
        setProject(updatedProject);
        console.log('Project configuration updated successfully');
        alert('Configuration saved successfully');
      }
      
      // Reset form states
      setRosterFile(null);
      setRosterUrl('');
    } catch (error) {
      console.error('Error updating project configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const handleRosterUpload = async () => {
    if (rosterType === 'file' && !rosterFile) {
      alert('Please select a file to upload');
      return;
    }
    
    if (rosterType === 'url' && !rosterUrl.trim()) {
      alert('Please enter a valid URL');
      return;
    }
    
    setUploadingRoster(true);
    
    try {
      if (isDevelopment) {
        // Mock roster upload
        console.log('Mock uploading roster:', { type: rosterType, file: rosterFile, url: rosterUrl });
        alert('Roster uploaded successfully (mock)');
      } else {
        // Use Tauri backend to upload roster
        const { invoke } = await import('@tauri-apps/api/core');
        
        if (rosterType === 'file') {
          // Handle file upload
          await invoke('upload_roster_file', { 
            projectId: project.id, 
            filePath: rosterFile.path, 
            accessToken 
          });
        } else {
          // Handle URL upload
          await invoke('upload_roster_url', { 
            projectId: project.id, 
            url: rosterUrl, 
            accessToken 
          });
        }
        
        console.log('Roster uploaded successfully');
        alert('Roster uploaded successfully');
      }
      
      // Reset form
      setRosterFile(null);
      setRosterUrl('');
    } catch (error) {
      console.error('Error uploading roster:', error);
      alert('Failed to upload roster. Please try again.');
    } finally {
      setUploadingRoster(false);
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setRosterFile(file);
    }
  }

  if (loading) {
    return (
      <div className="project-edit-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading project...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="project-edit-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Project Not Found</h3>
          <p>{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="project-edit-container">
        <div className="no-project-state">
          <div className="no-project-icon">📁</div>
          <h3>No Project Selected</h3>
          <p>Please select a project from the dashboard to edit.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="project-edit-container">
      <div className="project-edit-header">
        <button
          onClick={() => navigate(`/project/${id}`)}
          className="back-button"
        >
          <span className="back-arrow">←</span>
          Back to Project
        </button>
        <div className="project-title-section">
          <h1>Edit Project: {project.name}</h1>
          <p>Configure metadata and upload roster</p>
          {isDevelopment && (
            <div className="development-notice">
              🚧 Development Mode - Using Mock Data
            </div>
          )}
        </div>
      </div>

      {project && (
        <div className="project-edit-content">
          {/* Metadata Editing Section */}
          <div className="edit-section">
            <h2>Edit Metadata</h2>
            <div className="metadata-editor">
              <div className="metadata-controls">
                <div className="metadata-format">
                  <span className="format-text">Replace</span>
                  <div className="form-group">
                    <select
                      value={metadataType}
                      onChange={(e) => setMetadataType(e.target.value)}
                      className="metadata-select"
                    >
                      <option value="description">Description</option>
                      <option value="title">Title</option>
                    </select>
                  </div>
                  <span className="format-text">with</span>
                  <div className="form-group">
                    <select
                      value={informationType}
                      onChange={(e) => setInformationType(e.target.value)}
                      className="information-select"
                    >
                      <option value="player_name">Player Name</option>
                      <option value="player_number">Player Number</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Roster Upload Section */}
          <div className="edit-section">
            <h2>Upload Roster</h2>
            <div className="roster-uploader">
              <div className="roster-type-selector">
                <label>Upload Method</label>
                <div className="roster-toggle">
                  <button
                    type="button"
                    onClick={() => setRosterType('file')}
                    className={`toggle-btn ${rosterType === 'file' ? 'active' : ''}`}
                  >
                    📁 File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterType('url')}
                    className={`toggle-btn ${rosterType === 'url' ? 'active' : ''}`}
                  >
                    🌐 URL Input
                  </button>
                </div>
              </div>

              {rosterType === 'file' && (
                <div className="file-upload-section">
                  <label>Select Roster File</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileSelect}
                    className="file-input"
                  />
                  {rosterFile && (
                    <div className="file-info">
                      <span className="file-icon">📄</span>
                      <span className="file-name">{rosterFile.name}</span>
                    </div>
                  )}
                </div>
              )}

              {rosterType === 'url' && (
                <div className="url-input-section">
                  <label>Roster URL</label>
                  <input
                    type="url"
                    value={rosterUrl}
                    onChange={(e) => setRosterUrl(e.target.value)}
                    placeholder="https://example.com/roster.csv"
                    className="url-input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Project Actions - At the very bottom of the page */}
          <div className="project-actions">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Save All Configuration'}
            </button>
            <button
              onClick={() => navigate(`/project/${id}`)}
              className="btn btn-secondary"
            >
              View Project
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-outline"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectEdit
