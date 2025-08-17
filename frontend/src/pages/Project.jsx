import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tauriSupabase } from '../tauriClient'
import { useAuth } from '../contexts/AuthContext'

function Project() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [photos, setPhotos] = useState([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [metadataPanelOpen, setMetadataPanelOpen] = useState(false)
  const { user, isDevelopment, getMockProject, accessToken } = useAuth()

  useEffect(() => {
    if (id) {
      fetchProject()
    } else {
      setLoading(false)
    }
  }, [id])

  const fetchProject = async () => {
    try {
      if (isDevelopment) {
        // Use mock data in development mode
        if (!user) {
          setError('User not authenticated')
          setLoading(false)
          return
        }

        const { data, error } = await getMockProject(id)
        
        if (error) {
          setError('Project not found')
        } else {
          setProject(data)
          
          // Load photos after setting project
          if (data && data.folder_path) {
            loadPhotosFromFolder(data);
          }
        }
      } else {
        // Use Tauri backend
        try {
          // Use the Tauri invoke command directly instead of tauriSupabase
          const { invoke } = await import('@tauri-apps/api/core');
          const projectData = await invoke('get_project_by_id', { 
            projectId: id, 
            userId: user.id, 
            accessToken: accessToken
          });
          
          if (projectData) {
            setProject(projectData);
            
            // Load photos after setting project
            if (projectData && projectData.folder_path) {
              loadPhotosFromFolder(projectData);
            } else {
              console.log('No folder_path found, photos will not be loaded automatically');
            }
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

  const loadPhotosFromFolder = async (projectData = null) => {
    const targetProject = projectData || project;
    
    if (!targetProject) {
      return;
    }
    
    if (!targetProject.folder_path) {
      setPhotos([]);
      setPhotosLoading(false);
      return;
    }
    
    setPhotosLoading(true);
    
    try {
      if (isDevelopment) {
        // Mock photos for development mode
        const mockPhotos = [
          {
            id: 1,
            name: 'photo1.jpg',
            path: targetProject.folder_path + '/photo1.jpg',
            size: '2.3 MB',
            dimensions: '1920x1080',
            dateModified: new Date().toISOString(),
            type: 'image/jpeg'
          },
          {
            id: 2,
            name: 'photo2.png',
            path: targetProject.folder_path + '/photo2.png',
            size: '1.8 MB',
            dimensions: '2560x1440',
            dateModified: new Date(Date.now() - 86400000).toISOString(),
            type: 'image/png'
          },
          {
            id: 3,
            name: 'photo3.jpg',
            path: targetProject.folder_path + '/photo3.jpg',
            size: '3.1 MB',
            dimensions: '3840x2160',
            dateModified: new Date(Date.now() - 172800000).toISOString(),
            type: 'image/jpeg'
          }
        ];
        
        setPhotos(mockPhotos);
        console.log('Mock photos loaded:', mockPhotos.length);
        return mockPhotos;
      } else {
        // Use Tauri backend to read folder contents
        const { invoke } = await import('@tauri-apps/api/core');
        
        console.log('Loading photos from folder:', targetProject.folder_path);
        const folderPhotos = await invoke('read_project_folder', { 
          projectId: targetProject.id,
          folderPath: targetProject.folder_path,
          accessToken: accessToken
        });
        
        console.log('Backend returned photos:', folderPhotos);
        
        // Convert the backend data format to match frontend expectations
        const processedPhotos = folderPhotos.map(photo => ({
          ...photo,
          dateModified: new Date(photo.dateModified * 1000).toISOString(), // Convert Unix timestamp to ISO string
          dimensions: photo.dimensions || 'Unknown' // Ensure dimensions field exists
        }));
        
        console.log('Processed photos:', processedPhotos);
        setPhotos(processedPhotos || []);
        
        // Return the processed photos for external use
        return processedPhotos || [];
      }
    } catch (error) {
      console.error('❌ Error loading photos:', error);
      setPhotos([]);
      return []; // Return empty array on error
    } finally {
      setPhotosLoading(false);
    }
  }

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
    setMetadataPanelOpen(true);
  }

  const closeMetadataPanel = () => {
    setMetadataPanelOpen(false);
    setSelectedPhoto(null);
  }

  const handleSelectFolder = async () => {
    try {
      if (isDevelopment) {
        // Mock folder selection for development mode
        const mockFolderPath = '/mock/selected/folder';
        
        // Update project with new folder path
        const updatedProject = { ...project, folder_path: mockFolderPath };
        setProject(updatedProject);
        
        // Load photos from the new folder
        await loadPhotosFromFolder(updatedProject);
        
        alert('Mock folder selected: ' + mockFolderPath);
      } else {
        // Use Tauri backend to select folder
        const { invoke } = await import('@tauri-apps/api/core');
        const selectedFolder = await invoke('select_folder');
        
        if (selectedFolder) {
          // Update project with new folder path in the database
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('update_project', {
              projectId: project.id,
              project: { ...project, folder_path: selectedFolder },
              accessToken: accessToken
            });
            
            // Update local project state
            const updatedProject = { ...project, folder_path: selectedFolder };
            setProject(updatedProject);
            
            // Load photos from the new folder
            await loadPhotosFromFolder(updatedProject);
            
          } catch (updateError) {
            console.error('Error updating project in database:', updateError);
            alert('Failed to update project with new folder path. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert('Failed to select folder: ' + error.message);
    }
  }

  const deleteProject = async () => {
    if (!project || !user) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setDeleting(true);
    
    try {
      if (isDevelopment) {
        // Mock delete - just navigate back to dashboard
        navigate('/dashboard?refresh=true');
      } else {
        // Use Tauri backend to delete project
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_project', { 
          projectId: project.id, 
          accessToken 
        });
        
        navigate('/dashboard?refresh=true');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="project-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading project...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="project-container">
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

  if (!id) {
    return (
      <div className="project-container">
        <div className="no-project-state">
          <div className="no-project-icon">📁</div>
          <h3>No Project Selected</h3>
          <p>Please select a project from the dashboard to get started.</p>
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
    <div className="project-container">
      <div className="project-header">
        <button
          onClick={() => navigate('/dashboard')}
          className="back-button"
        >
          <span className="back-arrow">←</span>
          Back to Dashboard
        </button>
        <div className="project-title-section">
          <h1 className="project-title">{project?.name || 'Project'}</h1>
          <p className="project-subtitle">Manage your photo collection</p>
          {isDevelopment && (
            <div className="development-notice">
              🚧 Development Mode - Using Mock Data
            </div>
          )}
        </div>
        <div className="project-actions">
          <button
            onClick={() => navigate(`/project/${id}/edit`)}
            className="btn btn-secondary"
            title="Edit project"
          >
            Edit
          </button>
          <button
            onClick={deleteProject}
            className="btn btn-danger"
            disabled={deleting}
            title="Delete project"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {project && (
        <div className="project-content">
          <div className="project-overview">
            <div className="project-image-section">
              <img
                src={project.image_url || 'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg'}
                alt={project.name}
                className="project-hero-image"
              />
            </div>
            <div className="project-details">
              <h2 className="project-name">{project.name}</h2>
              <p className="project-description">{project.description}</p>
              <div className="project-meta">
                <div className="meta-item">
                  <span className="meta-label">Created</span>
                  <span className="meta-value">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Status</span>
                  <span className="meta-value status-active">{project.status || 'Active'}</span>
                </div>
                {project.photo_count > 0 && (
                  <div className="meta-item">
                    <span className="meta-label">Photos</span>
                    <span className="meta-value">📸 {project.photo_count}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="project-sections">
            <div className="section-card">
              <h3 className="section-title">Project Details</h3>
              <p className="section-content">
                This is where you can add more project functionality like tasks, files, or other features.
              </p>
              <div className="section-actions">
                <button className="btn btn-secondary">Add Photos</button>
                <button className="btn btn-outline">Export Project</button>
              </div>
            </div>

            <div className="section-card">
              <h3 className="section-title">Recent Activity</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon">📸</div>
                  <div className="activity-content">
                    <span className="activity-text">Project created</span>
                    <span className="activity-time">Just now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Grid Section */}
          <div className="photo-grid-section">
            <div className="section-header">
              <h2 className="section-title">Photos</h2>
              {/* Current folder path display */}
              {project?.folder_path && (
                <div style={{fontSize: '14px', color: '#666', marginTop: '5px', fontStyle: 'italic'}}>
                  📁 Current folder: {project.folder_path}
                </div>
              )}
              {/* Debug info */}
              <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                Photos loaded: {photos.length} | Loading: {photosLoading.toString()}
              </div>
            </div>

            {photosLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading photos from folder...</p>
              </div>
            ) : photos.length > 0 ? (
              <div className="photo-grid">
                {photos.map((photo) => (
                  <div 
                    key={photo.id} 
                    className="photo-item"
                    onClick={() => handlePhotoClick(photo)}
                  >
                    <div className="photo-thumbnail">
                      <div className="photo-placeholder">
                        <span className="photo-icon">📷</span>
                      </div>
                    </div>
                    <div className="photo-info">
                      <span className="photo-name">{photo.name}</span>
                      <span className="photo-size">{photo.size}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-photos">
                <div className="empty-icon">📁</div>
                <h3>No Photos Found</h3>
                <p>
                  {project?.folder_path 
                    ? `No photos were found in the selected folder: ${project.folder_path}`
                    : 'No folder has been selected for this project yet.'
                  }
                </p>
                <button 
                  onClick={handleSelectFolder}
                  className="btn btn-primary"
                >
                  {project?.folder_path ? 'Change Folder' : 'Select Folder'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata Panel Overlay */}
      {metadataPanelOpen && selectedPhoto && (
        <div className="metadata-overlay" onClick={closeMetadataPanel}>
          <div className="metadata-panel" onClick={(e) => e.stopPropagation()}>
            <div className="metadata-header">
              <h3>Photo Metadata</h3>
              <button 
                onClick={closeMetadataPanel}
                className="close-button"
              >
                ×
              </button>
            </div>
            <div className="metadata-content">
              <div className="photo-preview">
                <div className="photo-placeholder-large">
                  <span className="photo-icon-large">📷</span>
                </div>
              </div>
              <div className="metadata-details">
                <div className="metadata-row">
                  <span className="metadata-label">Filename:</span>
                  <span className="metadata-value">{selectedPhoto.name}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">File Size:</span>
                  <span className="metadata-value">{selectedPhoto.size}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Dimensions:</span>
                  <span className="metadata-value">{selectedPhoto.dimensions}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Type:</span>
                  <span className="metadata-value">{selectedPhoto.type}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Modified:</span>
                  <span className="metadata-value">
                    {new Date(selectedPhoto.dateModified).toLocaleString()}
                  </span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Path:</span>
                  <span className="metadata-value path-value">{selectedPhoto.path}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Project 