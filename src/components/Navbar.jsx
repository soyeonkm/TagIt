import { useState } from 'react'
import { Link } from 'react-router-dom'

function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

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
        <Link to="/" style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold',
          color: 'var(--primary-color)',
          textDecoration: 'none'
        }}>
          TagIt
        </Link>
        <div style={{ 
          display: 'flex', 
          gap: '2rem',
          alignItems: 'center'
        }}>
          <Link to="/" style={{
            color: 'var(--text-color)',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}>
            Home
          </Link>
          <Link to="/about" style={{
            color: 'var(--text-color)',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}>
            About
          </Link>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={toggleDropdown}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'var(--primary-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}
          >
            U
          </button>
          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              marginTop: '0.5rem',
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.5rem 0',
              minWidth: '150px',
              zIndex: 1000
            }}>
              <button
                onClick={() => {
                  setIsDropdownOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.9rem'
                }}
              >
                Profile
              </button>
              <button
                onClick={() => {
                  setIsDropdownOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.9rem'
                }}
              >
                Settings
              </button>
              <button
                onClick={() => {
                  setIsDropdownOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.9rem'
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar 