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
  
  // Roster state
  const [rosterFile, setRosterFile] = useState(null) // display name only
  const [rosterSuccess, setRosterSuccess] = useState('')
  const [rosterError, setRosterError] = useState('')

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

  const handleRosterUpload = async () => {
    setRosterError('')
    setRosterSuccess('')
    setUploadingRoster(true)

    try {
      const { invoke } = await import('@tauri-apps/api/core')

      // Open native PDF file picker
      let pdfPath
      try {
        pdfPath = await invoke('select_pdf_file')
      } catch (_cancelled) {
        setUploadingRoster(false)
        return
      }

      setRosterFile(pdfPath.split(/[\\/]/).pop())

      const result = await invoke('parse_roster_from_pdf', {
        pdfPath,
        projectId: project.id,
        accessToken
      })

      if (result.success) {
        setRosterSuccess(`✅ Parsed ${result.players.length} players from roster PDF`)
      } else {
        setRosterError(`Failed: ${result.error_message || 'Unknown error'}`)
      }
    } catch (error) {
      setRosterError(`Error: ${error}`)
    } finally {
      setUploadingRoster(false)
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

          {/* Roster Upload Section — PDF only */}
          <div className="edit-section">
            <h2>📄 Upload Roster PDF</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '0.95rem' }}>
              Upload your team roster as a PDF. Gemini Vision AI will extract player names,
              jersey numbers, positions and headshots automatically.
            </p>
            <div className="pdf-upload-area">
              <div className="pdf-upload-icon">📄</div>
              <div className="pdf-upload-info">
                {rosterFile ? (
                  <span className="pdf-selected-name">📎 {rosterFile}</span>
                ) : (
                  <span className="pdf-upload-hint">No PDF selected yet</span>
                )}
              </div>
              <button
                className="btn btn-primary pdf-upload-btn"
                onClick={handleRosterUpload}
                disabled={uploadingRoster}
              >
                {uploadingRoster ? (
                  <><span className="btn-spinner" /> Parsing…</>
                ) : (
                  '📂 Upload & Parse PDF'
                )}
              </button>
            </div>

            {rosterError && (
              <div className="error-message" style={{ marginTop: '12px' }}>
                <span className="error-icon">⚠️</span>
                <span>{rosterError}</span>
                <button className="clear-btn" onClick={() => setRosterError('')}>✕</button>
              </div>
            )}
            {rosterSuccess && (
              <div className="success-message" style={{ marginTop: '12px' }}>
                <span className="success-icon">✅</span>
                <span>{rosterSuccess}</span>
              </div>
            )}
          </div>

          {/* Project Actions - At the very bottom of the page */}
          <div className="project-actions">
            <button
              onClick={handleMetadataEdit}
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
