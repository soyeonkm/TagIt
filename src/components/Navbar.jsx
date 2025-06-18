import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav style={{
      padding: '1rem 2rem',
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          TagIt
        </Link>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar 