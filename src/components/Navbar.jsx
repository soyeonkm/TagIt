import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const menuRef = useRef(null)

  
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside) 
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <nav style={{
      padding: '0.5rem 0',
      backgroundColor: 'var(--navbar-color)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      width: '100%',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 1rem'
      }}>
        <Link to="/" style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold',
          color: 'var(--text-color)',
          textDecoration: 'none',
          flexShrink: 0,
          fontFamily: 'var(--main-font)'
        }}>
          TagIt
        </Link>
        <div style={{ 
          display: 'flex', 
          gap: '1rem',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={toggleMenu}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-color)',
                fontSize: '1.5rem'
              }}
            >
              ☰
            </button>
            {isMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '0.5rem',
                backgroundColor: 'var(--navbar-color)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                padding: '0.5rem 0',
                minWidth: '150px',
                zIndex: 1000,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.3rem 0.8rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--main-font)'
                  }}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.3rem 0.8rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--main-font)'
                  }}
                >
                  Projects
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.3rem 0.8rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--main-font)'
                  }}
                >
                  Settings
                </button>
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={toggleDropdown}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--accent-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}
            >
              S
            </button>
            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '0.5rem',
                backgroundColor: 'var(--navbar-color)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                padding: '0.5rem 0',
                minWidth: '150px',
                zIndex: 1000,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.3rem 0.8rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--main-font)'
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
                    padding: '0.3rem 0.8rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--main-font)'
                  }}
                >
                  Account Settings
                </button>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.3rem 0.8rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--main-font)'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar 