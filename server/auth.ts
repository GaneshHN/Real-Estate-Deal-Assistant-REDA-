import type { NextFunction, Request, Response } from 'express'
import { createClient, type User } from '@supabase/supabase-js'

export type AppRole = 'admin' | 'broker' | 'agent'
export type AuthenticatedRequest = Request & { user?: User; role?: AppRole }

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('[api] Supabase URL and publishable/anon key are required for auth')
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null

export function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  void authenticate(request, response, next)
}

async function authenticate(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  if (!supabase) return response.status(503).json({ success: false, error: 'Authentication is not configured' })
  const header = request.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return response.status(401).json({ success: false, error: 'Bearer token required' })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return response.status(401).json({ success: false, error: 'Invalid or expired token' })
  request.user = data.user
  request.role = getRole(data.user)
  next()
}

export function requireRole(...allowed: AppRole[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.user) return response.status(401).json({ success: false, error: 'Authentication required' })
    if (!request.role || !allowed.includes(request.role)) return response.status(403).json({ success: false, error: 'Insufficient role' })
    next()
  }
}

export function getRole(user: User): AppRole {
  const role = user.app_metadata?.role
  return role === 'admin' || role === 'broker' || role === 'agent' ? role : 'agent'
}
