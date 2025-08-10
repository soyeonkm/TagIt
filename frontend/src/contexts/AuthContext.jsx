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
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if we're in a Tauri environment
        if (typeof window !== 'undefined' && window.__TAURI__) {
          // Tauri environment - check for existing user session
          // For now, we'll start with no user and let the backend handle authentication
          setLoading(false)
        } else {
          // Web environment - show message that Tauri is required
          console.log('This application requires the Tauri desktop app to run.');
          setLoading(false)
        }
      } catch (error) {
        console.log('No existing session found');
        setLoading(false);
      }
    };

    initializeAuth();
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
        
        // Store the access token if available
        if (data.user.access_token) {
          console.log('Debug - Setting accessToken in signIn:', data.user.access_token); // Debug log
          setAccessToken(data.user.access_token)
        }
        
        return { data: { user: userObj }, error: null }
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Tauri sign in error:', error)
      return { data: null, error }
    }
  }

  // Sign up with Tauri backend
  const signUp = async (email, password, profileData = null) => {
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
        
        // Store the access token if available
        if (data.user.access_token) {
          console.log('Debug - Setting accessToken in signUp:', data.user.access_token); // Debug log
          setAccessToken(data.user.access_token)
          
          // If profile data is provided and we have an access token, create the profile
          if (profileData && data.user.access_token) {
            try {
              // Add the user ID to the profile data
              const profileWithId = {
                ...profileData,
                id: data.user.id
              }
              await tauriSupabase.from('profiles').insert([profileWithId], data.user.access_token)
            } catch (profileError) {
              console.error('Failed to create profile:', profileError)
              // Don't fail the signup if profile creation fails
            }
          }
        }
        
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
      // Sign out through Tauri backend
      await tauriSupabase.auth.signOut();
      
      // Clear the local user state and access token
      setUser(null)
      setAccessToken(null)
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local state even if remote sign out fails
      setUser(null);
      setAccessToken(null);
      return { error }
    }
  }

  // Get current user
  const getCurrentUser = () => {
    return user
  }

  const value = {
    user,
    accessToken,
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
