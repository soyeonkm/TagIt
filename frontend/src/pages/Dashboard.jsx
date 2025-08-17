import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { tauriSupabase } from '../tauriClient'
import { useAuth } from '../contexts/AuthContext'

function Dashboard() {
  const [addHover, setAddHover] = useState(false)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading, isDevelopment, getMockProjects, accessToken } = useAuth()

  // Fetch projects on component mount
  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user])

  // Check for refresh parameter in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    if (searchParams.get('refresh') === 'true' && user) {
      console.log('Refresh parameter detected, refreshing projects...')
      fetchProjects()
      // Clean up the URL
      navigate('/dashboard', { replace: true })
    }
  }, [location.search, user, navigate])

  // Add focus event listener to refresh projects when returning to dashboard
  useEffect(() => {
    const handleFocus = () => {
      if (user && !loading) {
        console.log('Dashboard focused, refreshing projects...')
        fetchProjects()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user, loading])

  const fetchProjects = async () => {
    try {
      if (!user) {
        console.log('No user found, redirecting to login')
        setError('User not authenticated')
        setLoading(false)
        navigate('/login')
        return
      }

      console.log('Fetching projects for user:', user.id, 'Development mode:', isDevelopment, 'Access token:', accessToken ? 'Present' : 'Missing')

      if (isDevelopment) {
        // Use mock data in development mode
        const { data, error } = await getMockProjects()
        console.log('Mock projects result:', { data, error })
        if (error) {
          console.error('Error fetching mock projects:', error)
          setError('Failed to load projects')
        } else {
          setProjects(data || [])
          console.log('Set mock projects:', data || [])
        }
      } else {
        // Use Tauri backend to fetch projects
        console.log('Fetching from Tauri backend...')
        
        if (!accessToken || accessToken === 'mock-token') {
          console.error('No valid access token available for Tauri backend');
          setError('Authentication required. Please sign in again.');
          return;
        }
        
        try {
          // Use the Tauri invoke command directly instead of tauriSupabase
          const { invoke } = await import('@tauri-apps/api/core');
          
          const invokeParams = { 
            userId: user.id, 
            accessToken: accessToken
          };
          
          console.log('Calling Tauri get_projects with params:', invokeParams);
          console.log('Parameter types:', {
            user_id: typeof invokeParams.user_id,
            access_token: typeof invokeParams.access_token
          });
          
          const projectsData = await invoke('get_projects', invokeParams);
          
          console.log('Tauri get_projects result:', projectsData);
          
          if (projectsData) {
            setProjects(projectsData || []);
            console.log('Set Tauri projects:', projectsData || []);
          } else {
            setError('No projects returned from backend');
          }
        } catch (invokeError) {
          console.error('Tauri invoke error details:', {
            message: invokeError.message,
            stack: invokeError.stack,
            error: invokeError
          });
          setError(`Failed to load projects from backend: ${invokeError.message || invokeError}`);
        }
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
        <div className="dashboard-title-section">
          <h1 className="dashboard-title">My Projects</h1>
          <p className="dashboard-subtitle">Organize and manage your photo collections</p>
        </div>
        <div className="dashboard-actions">
          <button 
            onClick={fetchProjects}
            className="btn btn-icon btn-secondary"
            disabled={loading}
            title="Refresh projects"
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
        {isDevelopment && (
          <div className="development-notice">
            🚧 Development Mode - Using Mock Data
          </div>
        )}
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
                {project.photo_count > 0 && (
                  <span className="project-photo-count">
                    📸 {project.photo_count} photos
                  </span>
                )}
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