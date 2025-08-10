// Import required hooks and modules
import { useState } from 'react'
import { tauriSupabase } from '../tauriClient' // Tauri backend client
import { useNavigate } from 'react-router-dom' // Hook to navigate between routes
import { useAuth } from '../contexts/AuthContext' // Authentication context

function Login() {
  // State variables for form fields and UI states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false) // Toggle between login and signup
  const [error, setError] = useState('')          // Error message state
  const [message, setMessage] = useState('')      // Success or status message
  const [firstName, setFirstName] = useState('')  // First name for signup
  const [lastName, setLastName] = useState('')    // Last name for signup
  const navigate = useNavigate()                  // Router navigation hook
  const { signInWithPassword, signUp } = useAuth() // Authentication methods

  // Handle login or signup form submission
  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (isSignUp) {
      // Always use sub-accent-color for profile color
      const profileColor = 'var(--sub-accent-color)'

      // Call Tauri backend signUp method
      const { data, error } = await signUp(email, password)

      if (error) {
        setError(error.message)
      } else {
        // If signup is successful, insert user profile into the 'profiles' table
        const userId = data.user?.id
        if (userId) {
          await tauriSupabase.from('profiles').insert([
            {
              id: userId,
              first_name: firstName,
              last_name: lastName,
              profile_color: profileColor
            }
          ])
        }
        setMessage('Check your email for a confirmation link!')
      }
    } else {
      // Handle user login using Tauri backend via AuthContext
      console.log('Attempting login with Tauri backend...')
      const { data, error } = await signInWithPassword(email, password)
      if (error) {
        console.error('Login error:', error)
        setError(error.message)
      } else {
        console.log('Login successful:', data)
        setMessage('Logged in successfully!')
        // Add a small delay to ensure authentication state is properly set
        setTimeout(() => {
          console.log('Navigating to dashboard...')
          navigate('/dashboard') // redirect to dashboard page when logged in
        }, 100)
      }
    }
  }

  // Handle password reset request
  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const { data, error } = await tauriSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    
    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for a password reset link!')
    }
  }

  // Render form UI
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="auth-subtitle">
            {isSignUp ? 'Start organizing your photos today' : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          {/* Show first/last name fields only in signup mode */}
          {isSignUp && (
            <div className="name-fields">
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                className="auth-input"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                className="auth-input"
              />
            </div>
          )}

          {/* Email input field */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="auth-input"
          />

          {/* Password input field */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="auth-input"
          />

          {/* Error or status messages */}
          {error && (
            <div className="message error">
              <div className="message-icon">⚠️</div>
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="message success">
              <div className="message-icon">✅</div>
              <span>{message}</span>
            </div>
          )}

          {/* Submit button */}
          <button type="submit" className="auth-button">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Buttons to toggle between login/signup and forgot password */}
        <div className="auth-actions">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="auth-toggle-button"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
          <button
            onClick={handleReset}
            className="auth-reset-button"
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
