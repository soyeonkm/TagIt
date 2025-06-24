import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCallback } from 'react'

function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [showLogoutMsg, setShowLogoutMsg] = useState(false)
  const [logoutMsgOpacity, setLogoutMsgOpacity] = useState(1)
  const [profile, setProfile] = useState(null)

  
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

  useEffect(() => {
    if (user) {
      // Fetch profile from SQL table
      supabase
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
          <span
            onClick={() => {
              if (user) navigate('/projects')
              else navigate('/')
            }}
            style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              color: 'var(--text-color)',
              textDecoration: 'none',
              flexShrink: 0,
              fontFamily: 'var(--main-font)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
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
                style={{
                  padding: '0.5rem 1.2rem',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: 'var(--accent-color)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontFamily: 'var(--main-font)'
                }}
              >
                Login
              </button>
            ) : (
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: profile && !user.user_metadata?.avatar_url
                      ? (profile.profile_color || 'var(--accent-color)')
                      : 'var(--accent-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    padding: 0
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
                        navigate('/profile')
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
                        color: 'red',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--main-font)'
                      }}
                    >
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