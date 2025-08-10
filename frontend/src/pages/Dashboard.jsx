import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tauriSupabase } from '../tauriClient'
import { useAuth } from '../contexts/AuthContext'

function Dashboard() {
  const [addHover, setAddHover] = useState(false)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  // Fetch projects on component mount
  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user])

  const fetchProjects = async () => {
    try {
      if (!user) {
        console.log('No user found, redirecting to login')
        setError('User not authenticated')
        setLoading(false)
        navigate('/login')
        return
      }

      // Use Tauri backend to fetch projects
      const { data, error } = await tauriSupabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching projects:', error)
        setError('Failed to load projects')
      } else {
        setProjects(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProject = async () => {
    // Navigate to the create project page
    navigate('/create-project');
  };

  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`)
  }

  if (authLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading authentication...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">My Projects</h1>
        <p className="dashboard-subtitle">Organize and manage your photo collections</p>
      </div>

      {error && (
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <span>{error}</span>
        </div>
      )}
      
      <div className="projects-grid">
        {/* Add Project Tile */}
        <button
          className={`add-project-card ${addHover ? 'hover' : ''}`}
          onClick={handleAddProject}
          onMouseEnter={() => setAddHover(true)}
          onMouseLeave={() => setAddHover(false)}
        >
          <div className="add-project-icon">
            <span>+</span>
          </div>
          <div className="add-project-label">Add New Project</div>
        </button>

        {/* Project Tiles */}
        {projects.map((project) => (
          <button
            key={project.id}
            className="project-card"
            onClick={() => handleProjectClick(project.id)}
          >
            <div className="project-image-container">
              <img
                src={project.image_url || 'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg'}
                alt={project.name}
                className="project-image"
              />
              <div className="project-overlay">
                <div className="project-overlay-content">
                  <span className="view-project">View Project</span>
                </div>
              </div>
            </div>
            <div className="project-info">
              <h3 className="project-name">{project.name}</h3>
              <p className="project-description">{project.description}</p>
              <div className="project-meta">
                <span className="project-date">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {projects.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">📸</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started with photo organization</p>
        </div>
      )}
    </div>
  )
}

export default Dashboard 