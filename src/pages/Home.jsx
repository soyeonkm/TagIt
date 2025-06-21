import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()
  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--main-font)',
        marginBottom: '2rem',
        color: 'var(--text-color)',
        textAlign: 'center'
      }}>
        TagIt
      </h1>
      <p style={{
        textAlign: 'center',
        color: 'var(--text-color)',
        fontFamily: 'var(--main-font)',
        fontSize: '1.2rem'
      }}>
        I still need to work on a lot of things...
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <button
          onClick={() => navigate('/projects')}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontFamily: 'var(--main-font)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--sub-accent-color)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
        >
          Projects
        </button>
      </div>
    </div>
  )
}

export default Home        