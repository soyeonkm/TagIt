import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isValidToken, setIsValidToken] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Check for password reset token in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search)
    
    // Debug: Log all URL parameters
    console.log('All URL parameters:', Object.fromEntries(urlParams.entries()))
    
    const accessToken = urlParams.get('access_token')
    const refreshToken = urlParams.get('refresh_token')
    const type = urlParams.get('type')
    const error = urlParams.get('error')
    const errorDescription = urlParams.get('error_description')
    const code = urlParams.get('code')

    console.log('Extracted tokens:', { accessToken, refreshToken, type, error, errorDescription, code })

    if (error) {
      setError(`Error: ${errorDescription || error}`)
      setIsValidToken(false)
      setIsLoading(false)
      return
    }

    // Check for different token formats
    if (accessToken && refreshToken && type === 'recovery') {
      // Store the tokens for later use in password update
      localStorage.setItem('reset_access_token', accessToken)
      localStorage.setItem('reset_refresh_token', refreshToken)
      
      setIsValidToken(true)
      setMessage('Please enter your new password below.')
      setIsLoading(false)
      // Clean up the URL by removing the tokens
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (code && type === 'recovery') {
      // Alternative format with just a code
      localStorage.setItem('reset_code', code)
      
      setIsValidToken(true)
      setMessage('Please enter your new password below.')
      setIsLoading(false)
      // Clean up the URL by removing the tokens
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      // Check if user is already authenticated (this happens when Supabase auto-logs in the user)
      supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (user && !error) {
          // User is authenticated, we can proceed with password reset
          setIsValidToken(true)
          setMessage('Please enter your new password below.')
          setIsLoading(false)
          // Clean up the URL by removing any parameters
          window.history.replaceState({}, document.title, window.location.pathname)
        } else {
          setError('Invalid reset link. Please request a new password reset.')
          setIsValidToken(false)
          setIsLoading(false)
        }
      })
    }
  }, [location])

  // Handle password reset confirmation
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    try {
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError('Reset session expired. Please request a new password reset.')
        return
      }

      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setError(error.message)
      } else {
        // Clear any stored tokens
        localStorage.removeItem('reset_access_token')
        localStorage.removeItem('reset_refresh_token')
        localStorage.removeItem('reset_code')
        
        // Sign out the user after password reset
        await supabase.auth.signOut()
        
        setMessage('Password updated successfully! Redirecting to login...')
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    }
  }

  if (isLoading) {
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          textAlign: 'center'
        }}>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  if (!isValidToken) {
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
            Invalid Reset Link
          </h2>
          {error && <div style={{ color: 'red', marginBottom: 12, textAlign: 'center' }}>{error}</div>}
          <button
            onClick={() => navigate('/login')}
            style={{
              width: '100%',
              padding: 10,
              fontSize: 16,
              background: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}>
            Back to Login
          </button>
        </div>
      </div>
    )
  }

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
          Set New Password
        </h2>

        <form onSubmit={handleResetPassword}>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12, padding: 8, fontSize: 16 }}
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
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
              marginBottom: 12,
              cursor: 'pointer'
            }}>
            Reset Password
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-color)',
              cursor: 'pointer',
              fontSize: 14,
              textDecoration: 'underline'
            }}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword 