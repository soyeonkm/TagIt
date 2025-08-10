import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tauriSupabase } from '../tauriClient'
import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const [showLogoutMsg, setShowLogoutMsg] = useState(false)
  const [logoutMsgOpacity, setLogoutMsgOpacity] = useState(1)
  const [profile, setProfile] = useState(null)
  const { user, signOut } = useAuth()

  
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
    if (user) {
      // Fetch profile from SQL table
      tauriSupabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data))
    } else {
      setProfile(null)
    }
  }, [user])

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-content">
          <span
            onClick={() => {
              if (user) navigate('/dashboard')
              else navigate('/')
            }}
            className="navbar-brand"
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            TagIt
          </span>
          <div style={{ 
            display: 'flex', 
            gap: '1rem',
            alignItems: 'center',
            flexShrink: 0
          }}>
            {/* Profile/Login button logic */}
            {!user ? (
              <button
                onClick={() => navigate('/login')}
                className="btn btn-primary"
              >
                Login
              </button>
            ) : (
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: !user.user_metadata?.avatar_url
                      ? 'var(--sub-accent-color)'
                      : 'var(--accent-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    padding: 0,
                    transition: 'var(--transition)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = 'var(--shadow-md)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = 'var(--shadow-sm)'
                  }}
                >
                  {user.user_metadata && user.user_metadata.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : profile && profile.first_name ? (
                    profile.first_name.charAt(0).toUpperCase()
                  ) : user.email ? (
                    user.email.charAt(0).toUpperCase()
                  ) : (
                    <span>U</span>
                  )}
                </button>
                {isDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '0.75rem',
                    backgroundColor: 'var(--navbar-color)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: 'var(--border-radius)',
                    padding: '0.5rem 0',
                    minWidth: '180px',
                    zIndex: 1000,
                    boxShadow: 'var(--shadow-lg)',
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false)
                        navigate('/profile')
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--text-color)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--main-font)',
                        transition: 'var(--transition)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'var(--hover-color)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span>👤</span>
                      Profile
                    </button>
                    <button
                      onClick={async () => {
                        await signOut()
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
                        padding: '0.75rem 1rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#dc2626',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--main-font)',
                        transition: 'var(--transition)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#fef2f2'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span>🚪</span>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
      {showLogoutMsg && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
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
              background: 'var(--navbar-color)',
              textAlign: 'center',
              fontWeight: 500,
              fontSize: '0.875rem',
              opacity: logoutMsgOpacity,
              transition: 'opacity 0.6s',
              marginTop: 0,
              pointerEvents: 'auto',
              boxShadow: 'var(--shadow-md)',
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--border-radius)',
              border: '1px solid rgba(0, 0, 0, 0.08)'
            }}
          >
            Successfully logged out!
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar 