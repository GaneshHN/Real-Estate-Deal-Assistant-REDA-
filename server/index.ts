import 'dotenv/config'
import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { getRole, requireAuth, requireRole, type AuthenticatedRequest } from './auth'

const app = express()
const port = Number(process.env.PORT) || 5000
const origins = process.env.ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean)
app.use(cors({ origin: origins?.length ? origins : true }))
app.use(express.json({ limit: '1mb' }))
app.use((request, _response, next) => { console.info(`[api] ${request.method} ${request.path}`); next() })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
const db = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null
const mutableRoles = ['admin', 'broker', 'agent'] as const
const propertyFields = ['title','propertyType','listingType','location','city','area','bedrooms','bathrooms','floor','totalFloors','price','description','amenities','ownerName','ownerPhone','ownerEmail','assignedAgent','status','lastVerifiedAt']
function toDb(input: Record<string, unknown>) { return Object.fromEntries(propertyFields.filter(key => key in input).map(key => [key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), input[key]])) }
function validProperty(input: Record<string, unknown>) {
  const required = ['title','propertyType','listingType','location','city','area','price','ownerName','status','lastVerifiedAt']
  if (required.some(key => input[key] === undefined || input[key] === null || input[key] === '')) return 'Complete all required fields.'
  if (Number(input.area) <= 0 || Number(input.price) <= 0) return 'Area and price must be positive.'
  if (Number(input.bedrooms ?? 0) < 0 || Number(input.bathrooms ?? 0) < 0) return 'Bedrooms and bathrooms cannot be negative.'
  if (!Array.isArray(input.amenities)) return 'Amenities must be a list.'
  return null
}
function fromDb(row: Record<string, unknown>) { return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), value])) }

app.get('/api/health', (_request, response) => response.json({ success: true, service: 'real-estate-api' }))
app.get('/api/auth/me', requireAuth, (request: AuthenticatedRequest, response) => response.json({ success: true, user: request.user, role: request.role || getRole(request.user!) }))
app.get('/api/properties', requireAuth, async (request: AuthenticatedRequest, response) => {
  if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' })
  const query = request.query
  const page = Math.max(1, Number(query.page) || 1); const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 12))
  let builder = db.from('properties').select('*', { count: 'exact' })
  if (query.search) builder = builder.or(`title.ilike.%${query.search}%,location.ilike.%${query.search}%,city.ilike.%${query.search}%`)
  if (query.propertyType) builder = builder.eq('property_type', query.propertyType)
  if (query.listingType) builder = builder.eq('listing_type', query.listingType)
  if (query.status) builder = builder.eq('status', query.status)
  if (query.city) builder = builder.ilike('city', `%${query.city}%`)
  if (query.minPrice) builder = builder.gte('price', Number(query.minPrice))
  if (query.maxPrice) builder = builder.lte('price', Number(query.maxPrice))
  if (query.bedrooms) builder = builder.gte('bedrooms', Number(query.bedrooms))
  const sort = query.sort === 'price_asc' ? ['price', true] : query.sort === 'price_desc' ? ['price', false] : ['created_at', false]
  const { data, error, count } = await builder.order(sort[0] as string, { ascending: sort[1] as boolean }).range((page - 1) * pageSize, page * pageSize - 1)
  if (error) return response.status(500).json({ success: false, error: error.message })
  response.json({ success: true, data: (data || []).map(fromDb), pagination: { page, pageSize, total: count || 0 } })
})
app.get('/api/properties/:id', requireAuth, async (request, response) => {
  if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' })
  const { data, error } = await db.from('properties').select('*, leads:property_leads(*), siteVisits:site_visits(*)').eq('id', request.params.id).single()
  if (error || !data) return response.status(404).json({ success: false, error: 'Property not found' })
  response.json({ success: true, data: fromDb(data) })
})
app.post('/api/properties', requireAuth, requireRole(...mutableRoles), async (request: AuthenticatedRequest, response) => {
  const errorMessage = validProperty(request.body)
  if (errorMessage) return response.status(400).json({ success: false, error: errorMessage })
  if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' })
  const { data, error } = await db.from('properties').insert(toDb(request.body)).select().single()
  if (error) return response.status(400).json({ success: false, error: error.message })
  response.status(201).json({ success: true, data: fromDb(data) })
})
app.put('/api/properties/:id', requireAuth, requireRole(...mutableRoles), async (request: AuthenticatedRequest, response) => {
  const errorMessage = validProperty(request.body)
  if (errorMessage) return response.status(400).json({ success: false, error: errorMessage })
  if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' })
  const { data, error } = await db.from('properties').update(toDb(request.body)).eq('id', request.params.id).select().single()
  if (error || !data) return response.status(error ? 400 : 404).json({ success: false, error: error?.message || 'Property not found' })
  response.json({ success: true, data: fromDb(data) })
})
app.delete('/api/properties/:id', requireAuth, requireRole('admin', 'broker'), async (request, response) => {
  if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' })
  const { error } = await db.from('properties').delete().eq('id', request.params.id)
  if (error) return response.status(400).json({ success: false, error: error.message })
  response.status(204).end()
})
app.get('/api/protected', requireAuth, (request: AuthenticatedRequest, response) => response.json({ success: true, message: 'Protected resource', userId: request.user!.id, role: request.role }))
app.get('/api/admin', requireAuth, requireRole('admin'), (_request, response) => response.json({ success: true, message: 'Admin resource' }))
const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => { console.error('[api] Unhandled error:', error); response.status(500).json({ success: false, error: 'Internal server error' }) }
app.use(errorHandler)
app.listen(port, () => console.info(`[api] real-estate-api listening on port ${port}`))
