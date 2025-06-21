import { useState } from 'react'

function Projects() {
  const [addHover, setAddHover] = useState(false)

  const handleAddProject = () => {
    // Handle adding new project
    console.log('Add new project clicked')
  }
  const handleProjectClick = (index) => {
    alert(`Clicked Project ${index + 1}`)
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
        Projects
      </h1>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
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
        {Array.from({ length: 1 }, (_, index) => (
          <button
            key={index}
            onClick={() => handleProjectClick(index)}
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
                src={'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg'}
                alt={`Project ${index + 1}`}
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
              Project {index + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Projects 