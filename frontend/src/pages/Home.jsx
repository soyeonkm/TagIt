import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '5rem 2rem',
        minHeight: '60vh',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flex: '0 1 60%', alignSelf: 'flex-start', marginTop: '1rem' }}>
        <span
          style={{
            fontSize: 46,
            fontWeight: 800,
            color: 'var(--text-color)',
            fontFamily: 'var(--main-font)',
            lineHeight: 1.3,
          }}
        >
          Instant photo tagging and organization—no uploads, no fuss.
        </span>
        <div style={{ marginTop: '1.5rem' }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--accent-color)',
              fontFamily: 'var(--main-font)',
              marginBottom: '0.5rem',
            }}
          >
            Smart, fast, and easy
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: 'var(--text-color)',
              fontFamily: 'var(--main-font)',
              opacity: 0.8,
              
            }}
          >
            Organize your sports photos with AI-powered tagging and project management.
          </div>
          <button
            style={{
              marginTop: '1.5rem',
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
              transition: 'background 0.2s',
              alignSelf: 'flex-end',
            }}
          >
            Try Now
          </button>
        </div>
      </div>
      <div
        style={{
          flex: '0 1 40%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          minHeight: 320,
        }}
      >
        <img
          src="https://cdn.photographylife.com/wp-content/uploads/2018/05/sports_tips_16.jpg"
          alt="Baseball player batting"
          style={{
            maxWidth: '100%',
            maxHeight: 320,
            borderRadius: 10,
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  )
}

export default Home        