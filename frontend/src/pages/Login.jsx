// Import required hooks and modules
import { useState } from 'react'
import { supabase } from '../supabaseClient' // Supabase client for auth & database
import { useNavigate } from 'react-router-dom' // Hook to navigate between routes

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

  // Handle login or signup form submission
  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (isSignUp) {
      // Always use sub-accent-color for profile color
      const profileColor = 'var(--sub-accent-color)'

      // Call Supabase signUp method
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        setError(error.message)
      } else {
        // If signup is successful, insert user profile into the 'profiles' table
        const userId = data.user?.id
        if (userId) {
          await supabase.from('profiles').insert([
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
      // Handle user login
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Logged in successfully!')
        navigate('/dashboard') // redirect to dashboard page when logged in
      }
    }
  }

  // Handle password reset request
  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    console.log('Requesting password reset for email:', email)
    console.log('Redirect URL:', `${window.location.origin}/reset-password`)

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    
    console.log('Reset password response:', { data, error })
    
    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for a password reset link!')
    }
  }

  // Render form UI
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        maxWidth: 400,
        width: '100%',
        padding: 32,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>
          {/* Dynamic form title based on mode */}
          {isSignUp ? 'Create Account' : 'Log In'}
        </h2>

        <form onSubmit={handleAuth}>
          {/* Show first/last name fields only in signup mode */}
          {isSignUp && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                style={{ width: '100%', marginBottom: 12, padding: 8, fontSize: 16 }}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                style={{ width: '100%', marginBottom: 12, padding: 8, fontSize: 16 }}
              />
            </>
          )}

          {/* Email input field */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12, padding: 8, fontSize: 16 }}
          />

          {/* Password input field */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12, padding: 8, fontSize: 16 }}
          />

          {/* Error or status messages */}
          {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
          {message && <div style={{ color: 'green', marginBottom: 12 }}>{message}</div>}

          {/* Submit button */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: 10,
              fontSize: 16,
              background: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              marginBottom: 12
            }}>
            {isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        {/* Buttons to toggle between login/signup and forgot password */}
        <div style={{
          textAlign: 'center',
          marginTop: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 12
        }}>
          <div style={{ display: 'flex', width: '100%', gap: 8 }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: 'var(--accent-color)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                borderRadius: 4,
                fontSize: 12,
                padding: '10px 0',
                fontFamily: 'var(--main-font)',
                flex: 1
              }}
            >
              {/* Toggle login/signup text */}
              {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
            </button>
            <button
              onClick={handleReset}
              style={{
                background: 'var(--accent-color)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                borderRadius: 4,
                fontSize: 12,
                padding: '10px 0',
                fontFamily: 'var(--main-font)',
                flex: 1
              }}
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
