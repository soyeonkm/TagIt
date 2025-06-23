import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [showLogoutMsg, setShowLogoutMsg] = useState(false)
  const [logoutMsgOpacity, setLogoutMsgOpacity] = useState(1)

  
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

  useEffect(() => {
    // Check initial user state
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <>
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
                  {!user ? (
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false)
                        navigate('/login')
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
                      Log In
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut()
                        navigate('/')
                        setIsDropdownOpen(false)
                        setShowLogoutMsg(true)
                        setLogoutMsgOpacity(1)
                        setTimeout(() => setLogoutMsgOpacity(0), 1000)
                        setTimeout(() => {
                          setShowLogoutMsg(false)
                          setLogoutMsgOpacity(1)
                        }, 1600)
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
                      Log Out
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      {showLogoutMsg && (
        <div
          style={{
            position: 'fixed',
            top: '64px', // adjust if your navbar height is different
            left: 0,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              color: 'var(--text-color)',
              background: 'none',
              textAlign: 'center',
              fontWeight: 200,
              fontSize: 20,
              opacity: logoutMsgOpacity,
              transition: 'opacity 0.6s',
              marginTop: 0,
              pointerEvents: 'auto',
              boxShadow: 'none',
            }}
          >
            You&apos;re logged out
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar 