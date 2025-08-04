import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
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
      <div style={{ 
        padding: '2rem',
        fontFamily: 'var(--main-font)',
        textAlign: 'center'
      }}>
        <div>Loading project...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        padding: '2rem',
        fontFamily: 'var(--main-font)',
        textAlign: 'center'
      }}>
        <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (!id) {
    return (
      <div style={{ 
        padding: '2rem',
        fontFamily: 'var(--main-font)',
        textAlign: 'center'
      }}>
        <h1>Project Page</h1>
        <p>No project selected. Please select a project from the dashboard.</p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '2rem',
      fontFamily: 'var(--main-font)',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '2rem',
        gap: '1rem'
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ 
          margin: 0,
          color: 'var(--text-color)'
        }}>
          {project?.name || 'Project'}
        </h1>
      </div>

      {project && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: '2rem'
        }}>
          <div style={{
            display: 'flex',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            <img
              src={project.image_url || 'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg'}
              alt={project.name}
              style={{
                width: '200px',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
            />
            <div style={{ flex: 1 }}>
              <h2 style={{ marginTop: 0, color: 'var(--text-color)' }}>
                {project.name}
              </h2>
              <p style={{ color: 'var(--text-color)', lineHeight: '1.6' }}>
                {project.description}
              </p>
              <p style={{ 
                color: 'var(--text-color)', 
                fontSize: '0.9rem',
                opacity: 0.7
              }}>
                Created: {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid #eee',
            paddingTop: '2rem'
          }}>
            <h3 style={{ color: 'var(--text-color)', marginBottom: '1rem' }}>
              Project Details
            </h3>
            <p style={{ color: 'var(--text-color)' }}>
              This is where you can add more project functionality like tasks, files, or other features.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Project 