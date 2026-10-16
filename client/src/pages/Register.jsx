
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setMessage('')

    if (password.length < 8) {
      setMessage('Password must contain at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.')
      }

      setMessage('Account created successfully! Redirecting to login...')

      setTimeout(() => {
        navigate('/login')
      }, 1200)
    } catch (error) {
      setMessage(error.message || 'Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-brand">LearnSphere</Link>
        <p className="auth-tagline">Your learning journey starts here ✨</p>

        <h1>Create your account</h1>
        <p className="auth-subtitle">Join LearnSphere and start learning.</p>

        <form onSubmit={handleRegister}>
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {message && <p className="auth-message" role="status">{message}</p>}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>

        <Link to="/" className="auth-home">← Back to Home</Link>
      </div>
    </div>
  )
}

export default Register
