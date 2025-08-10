import { createContext, useContext, useState, useEffect } from 'react'
import { tauriSupabase } from '../tauriClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth state
  useEffect(() => {
    // For now, we'll start with no user and let Tauri backend handle authentication
    // This ensures we're using the Tauri backend as the primary auth method
    setLoading(false)
  }, [])

  // Sign in with Tauri backend
  const signInWithPassword = async (email, password) => {
    try {
      const { data, error } = await tauriSupabase.auth.signInWithPassword({ email, password })
      if (error) {
        throw error
      }
      
      // After successful Tauri authentication, create a user object
      // Tauri backend returns a simple AuthUser with id and email
      if (data && data.user) {
        const userObj = {
          id: data.user.id,
          email: data.user.email,
          user_metadata: {} // Tauri backend doesn't provide user_metadata
        }
        setUser(userObj)
        return { data: { user: userObj }, error: null }
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Tauri sign in error:', error)
      return { data: null, error }
    }
  }

  // Sign up with Tauri backend
  const signUp = async (email, password) => {
    try {
      const { data, error } = await tauriSupabase.auth.signUp({ email, password })
      if (error) {
        throw error
      }
      
      // After successful Tauri signup, create a user object
      // Tauri backend returns a simple AuthUser with id and email
      if (data && data.user) {
        const userObj = {
          id: data.user.id,
          email: data.user.email,
          user_metadata: {} // Tauri backend doesn't provide user_metadata
        }
        setUser(userObj)
        return { data: { user: userObj }, error: null }
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Tauri sign up error:', error)
      return { data: null, error }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      // For now, just clear the local user state
      // We can implement Tauri backend sign out later if needed
      setUser(null)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  // Get current user
  const getCurrentUser = () => {
    return user
  }

  const value = {
    user,
    loading,
    signInWithPassword,
    signUp,
    signOut,
    getCurrentUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
