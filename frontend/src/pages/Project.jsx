import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tauriSupabase } from '../tauriClient'

function Project() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      fetchProject()
    } else {
      setLoading(false)
    }
  }, [id])

  const fetchProject = async () => {
    try {
      const { data: { user } } = await tauriSupabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      const { data, error } = await tauriSupabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching project:', error)
        setError('Project not found')
      } else {
        setProject(data)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

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
                  <span className="meta-value status-active">Active</span>
                </div>
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
        </div>
      )}
    </div>
  )
}

export default Project 