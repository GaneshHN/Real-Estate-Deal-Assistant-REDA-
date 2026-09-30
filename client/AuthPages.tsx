import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { supabase } from './lib/supabase'

export function AuthPages({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'broker' | 'agent'>('agent')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const isSignup = mode === 'signup'

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    if (!supabase) return setError('Supabase configuration is missing.')
    if (isSignup && name.trim().length < 2) return setError('Enter your full name.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (isSignup && password !== confirm) return setError('Passwords do not match.')
    if (isSignup) {
      const result = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } })
      if (result.error) return setError(result.error.message.toLowerCase().includes('already') ? 'Email already registered.' : 'Unable to create account.')
      if (!result.data.session) return setMessage('Account created successfully. Check your email to confirm your account, then sign in.')
      const profile = await fetch('/api/auth/profile', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${result.data.session.access_token}` }, body: JSON.stringify({ name: name.trim(), role }) })
      if (!profile.ok) return setError('Account created, but unable to create your user profile.')
      window.location.href = '/dashboard'
    } else {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (result.error) return setError('Invalid email or password.')
      window.location.href = '/dashboard'
    }
  }

  return <main className="auth-screen"><form className="login-card" onSubmit={submit}>
    <div className="brand"><Building2 size={20}/> Dealflow</div><p className="eyebrow">Property management</p><h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1><p className="muted">{isSignup ? 'Set up your workspace access.' : 'Sign in to manage your real estate inventory.'}</p>
    {isSignup && <><label>Full name<input value={name} onChange={event => setName(event.target.value)} required autoComplete="name" /></label><label>Role<select value={role} onChange={event => setRole(event.target.value as 'broker' | 'agent')}><option value="agent">Agent</option><option value="broker">Broker</option></select></label></>}
    <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={isSignup ? 'new-password' : 'current-password'} /></label>
    {isSignup && <label>Confirm password<input type="password" value={confirm} onChange={event => setConfirm(event.target.value)} required minLength={8} autoComplete="new-password" /></label>}
    {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}<button className="primary" type="submit">{isSignup ? 'Create account' : 'Sign in'}</button><a className="auth-link" href={isSignup ? '/login' : '/signup'}>{isSignup ? 'Already have an account? Sign in' : 'Need an account? Create one'}</a>
  </form></main>
}

export function AuthRoute() { return <AuthPages mode={window.location.pathname === '/signup' ? 'signup' : 'login'} /> }
export function DashboardRedirect() { window.history.replaceState({}, '', '/'); return null }
