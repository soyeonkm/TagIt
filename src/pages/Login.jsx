import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isReset, setIsReset] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (isSignUp) {
      // Pick a random color from the allowed CSS variable list
      const cssVars = [
        'var(--accent-color)',
        'var(--sub-accent-color)',
        'var(--hover-color)',
        'var(--navbar-color)',
        'var(--background-color)'
      ];
      const profileColor = cssVars[Math.floor(Math.random() * cssVars.length)]
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })
      if (error) setError(error.message)
      else {
        // Insert profile into SQL table
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
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else {
        setMessage('Logged in successfully!')
        navigate('/projects') // redirect to projects page when logged in
      }
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setError(error.message)
    else setMessage('Check your email for a password reset link!')
  }

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: 32, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>
        {isReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Log In'}
      </h2>
      <form onSubmit={isReset ? handleReset : handleAuth}>
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
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 12, padding: 8, fontSize: 16 }}
        />
        {!isReset && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12, padding: 8, fontSize: 16 }}
          />
        )}
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        {message && <div style={{ color: 'green', marginBottom: 12 }}>{message}</div>}
        <button type="submit" style={{ width: '100%', padding: 10, fontSize: 16, background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: 4 }}>
          {isReset ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Log In'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        {!isReset && (
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline', marginRight: 12 }}
          >
            {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
          </button>
        )}
        <button
          onClick={() => { setIsReset(!isReset); setIsSignUp(false); setMessage(''); setError('') }}
          style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isReset ? 'Back to Login' : 'Forgot password?'}
        </button>
      </div>
    </div>
  )
}

export default Login
