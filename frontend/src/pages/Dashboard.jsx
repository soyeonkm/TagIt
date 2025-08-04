import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Dashboard() {
  const [addHover, setAddHover] = useState(false)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        return
      }

      // Create new project
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            user_id: user.id,
            name: `Project ${projects.length + 1}`,
            description: 'New project',
            image_url: 'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg'
          }
        ])
        .select()

      if (error) {
        console.error('Error creating project:', error)
        setError('Failed to create project')
      } else {
        // Refresh projects list
        await fetchProjects()
        // Navigate to the new project
        if (data && data[0]) {
          navigate(`/project/${data[0].id}`)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to create project')
    }
  }

  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`)
  }

  if (loading) {
    return (
      <div style={{ 
        padding: '2rem',
        fontFamily: 'var(--main-font)',
        textAlign: 'center'
      }}>
        <div>Loading projects...</div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '2rem',
      fontFamily: 'var(--main-font)'
    }}>
      <h1 style={{ 
        fontFamily: 'var(--main-font)',
        marginBottom: '2rem',
        color: 'var(--text-color)',
        textAlign: 'center'
      }}>
        Dashboard
      </h1>

      {error && (
        <div style={{
          color: 'red',
          textAlign: 'center',
          marginBottom: '1rem',
          padding: '0.5rem',
          backgroundColor: '#ffebee',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1.5rem',
        maxWidth: '100%'
      }}>
        {/* Add Project Tile */}
        <button
          onClick={handleAddProject}
          style={{
            width: '100%',
            aspectRatio: '1',
            position: 'relative',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            borderRadius: '5px',
            border: 'none',
            padding: 0,
            background: 'none',
            cursor: 'pointer',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onMouseEnter={() => setAddHover(true)}
          onMouseLeave={() => setAddHover(false)}
        >
          <div style={{
            width: '100%',
            height: '80%',
            border: 'none',
            borderBottomLeftRadius: '0',
            borderBottomRightRadius: '0',
            borderRadius: '5px 5px 0 0',
            backgroundColor: addHover ? 'var(--hover-color)' : 'var(--navbar-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            color: addHover ? 'white' : 'var(--hover-color)',
            fontFamily: 'var(--main-font)',
            transition: 'background 0.2s, color 0.2s'
          }}>
            +
          </div>
          <div style={{
            width: '100%',
            height: '20%',
            backgroundColor: 'var(--sub-accent-color)',
            borderTopLeftRadius: '0',
            borderTopRightRadius: '0',
            borderRadius: '0 0 5px 5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            color: 'white',
            fontFamily: 'var(--main-font)'
          }}>
            Add Project
          </div>
        </button>

        {/* Project Tiles */}
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => handleProjectClick(project.id)}
            style={{
              width: '100%',
              aspectRatio: '1',
              position: 'relative',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              borderRadius: '5px',
              border: 'none',
              padding: 0,
              background: 'none',
              cursor: 'pointer',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              width: '100%',
              height: '80%',
              borderBottomLeftRadius: '0',
              borderBottomRightRadius: '0',
              borderRadius: '5px 5px 0 0',
              backgroundColor: 'var(--navbar-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              color: 'var(--text-color)',
              fontFamily: 'var(--main-font)',
              overflow: 'hidden'
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '80%'}
            onMouseOut ={e => e.currentTarget.style.opacity = '100%'}
            >
              <img
                src={project.image_url || 'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg'}
                alt={project.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  borderTopLeftRadius: '5px',
                  borderTopRightRadius: '5px'
                }}
              />
            </div>
            <div style={{
              width: '100%',
              height: '20%',
              backgroundColor: 'var(--sub-accent-color)',
              borderTopLeftRadius: '0',
              borderTopRightRadius: '0',
              borderRadius: '0 0 5px 5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              color: 'white',
              fontFamily: 'var(--main-font)'
            }}>
              {project.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Dashboard 