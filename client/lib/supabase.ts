import { createClient, type Session, type User } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export type AppRole = 'admin' | 'broker' | 'agent'

export function getUserRole(user: User | null): AppRole {
  const role = user?.app_metadata?.role
  return role === 'admin' || role === 'broker' || role === 'agent' ? role : 'agent'
}

export type AuthState = { user: User | null; session: Session | null; loading: boolean }

export function getDisplayName(user: User | null) {
  return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
}

export function apiToken(session: Session | null) {
  return session?.access_token || ''
}
