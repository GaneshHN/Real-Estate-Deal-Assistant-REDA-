import 'dotenv/config'
import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { getRole, requireAuth, requireRole, type AuthenticatedRequest } from './auth'
import { findMatches, missingRequirements, type LeadRequirements } from './services/matching.service'
import { duplicateWarning, findDuplicateMatches } from './services/duplicate.service'

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
const leadFields = ['name','phone','email','budgetMin','budgetMax','preferredLocation','propertyType','bedrooms','minArea','purpose','source','sourceLeadId','status','assignedAgentId','notes']
function toLeadDb(input: Record<string, unknown>) { return Object.fromEntries(leadFields.filter(key => key in input).map(key => [key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), input[key]])) }
function validLead(input: Record<string, unknown>) { if (!String(input.name || '').trim() || !String(input.phone || '').trim()) return 'Name and phone are required.'; return null }
async function duplicateLeads(input: Record<string, unknown>) {
  if (!db) return { matches: [], error: 'Database is not configured' }
  const phone = String(input.phone || '').replace(/\D/g, '')
  const email = String(input.email || '').trim().toLowerCase()
  const source = String(input.source || '').trim()
  const sourceLeadId = String(input.sourceLeadId || '').trim()
  const queries = [
    phone ? db.from('leads').select('id,name,phone,email,source,source_lead_id,status').eq('phone', input.phone) : Promise.resolve({ data: [], error: null }),
    email ? db.from('leads').select('id,name,phone,email,source,source_lead_id,status').ilike('email', email) : Promise.resolve({ data: [], error: null }),
    source && sourceLeadId ? db.from('leads').select('id,name,phone,email,source,source_lead_id,status').eq('source', source).eq('source_lead_id', sourceLeadId) : Promise.resolve({ data: [], error: null }),
  ]
  const results = await Promise.all(queries)
  const error = results.find(result => result.error)?.error
  if (error) return { matches: [], error: error.message }
  const rows = new Map<string, Record<string, unknown>>()
  results.flatMap(result => result.data || []).forEach(row => rows.set(String(row.id), row))
  return { matches: findDuplicateMatches(input, [...rows.values()].map(fromDb) as never[]), error: null }
}

app.get('/api/health', (_request, response) => response.json({ success: true, service: 'real-estate-api' }))
app.post('/api/leads', requireAuth, requireRole(...mutableRoles), async (request: AuthenticatedRequest, response) => {
  const input = request.body as Record<string, unknown>
  const errorMessage = validLead(input)
  if (errorMessage) return response.status(400).json({ success: false, error: errorMessage })
  if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' })
  const duplicateResult = await duplicateLeads(input)
  if (duplicateResult.error) return response.status(500).json({ success: false, error: duplicateResult.error })
  if (duplicateResult.matches.length && input.confirmDuplicate !== true) return response.status(409).json({ success: false, warning: duplicateWarning, existingLeads: duplicateResult.matches.map(match => ({ ...fromDb(match.lead), matchedOn: match.matchedOn })), actions: ['review_existing_lead', 'continue_creating_new_lead'] })
  const { data, error } = await db.from('leads').insert(toLeadDb(input)).select().single()
  if (error) return response.status(400).json({ success: false, error: error.message })
  response.status(201).json({ success: true, data: fromDb(data) })
})
app.post('/api/leads/import', requireAuth, requireRole(...mutableRoles), async (request: AuthenticatedRequest, response) => {
  const leads = Array.isArray(request.body?.leads) ? request.body.leads : []
  if (!leads.length) return response.status(400).json({ success: false, error: 'Provide a non-empty leads array.' })
  const results = []
  for (const lead of leads) {
    const input = lead as Record<string, unknown>
    const errorMessage = validLead(input)
    if (errorMessage) { results.push({ success: false, error: errorMessage, input }); continue }
    const duplicateResult = await duplicateLeads(input)
    if (duplicateResult.error) return response.status(500).json({ success: false, error: duplicateResult.error })
    if (duplicateResult.matches.length && input.confirmDuplicate !== true) { results.push({ success: false, warning: duplicateWarning, existingLeads: duplicateResult.matches.map(match => ({ ...fromDb(match.lead), matchedOn: match.matchedOn })), actions: ['review_existing_lead', 'continue_creating_new_lead'], input }); continue }
    const { data, error } = await db!.from('leads').insert(toLeadDb(input)).select().single()
    results.push(error ? { success: false, error: error.message, input } : { success: true, data: fromDb(data) })
  }
  response.status(200).json({ success: true, results })
})
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
app.get('/api/matches/:leadId', requireAuth, async (request, response) => {
  if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' })
  const { data: leadRow, error: leadError } = await db.from('leads').select('*').eq('id', request.params.leadId).single()
  if (leadError || !leadRow) return response.status(404).json({ success: false, error: 'Lead not found' })
  const lead = fromDb(leadRow) as LeadRequirements
  const missing = missingRequirements(lead)
  const { data: propertyRows, error: propertyError } = await db.from('properties').select('*').eq('status', 'Available')
  if (propertyError) return response.status(500).json({ success: false, error: propertyError.message })
  response.json({ success: true, data: { lead, missingRequirements: missing, matches: findMatches(lead, (propertyRows || []).map(fromDb) as never[]) } })
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
const visitStatuses = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'] as const
const followUpPriorities = ['Low', 'Medium', 'High'] as const
const followUpStatuses = ['Pending', 'Completed', 'Cancelled'] as const
const isoDate = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value))
const isManager = (request: AuthenticatedRequest) => request.role === 'admin' || request.role === 'broker'
function validVisit(input: Record<string, unknown>, partial = false) { if (!partial && (!input.lead || !input.property || !input.scheduledAt)) return 'Lead, property, and scheduled time are required.'; if (input.scheduledAt !== undefined && !isoDate(input.scheduledAt)) return 'scheduledAt must be a valid ISO date.'; if (input.status !== undefined && !visitStatuses.includes(input.status as never)) return 'Invalid visit status.'; return null }
function validFollowUp(input: Record<string, unknown>, partial = false) { if (!partial && (!input.lead || !input.dueAt || !String(input.note || '').trim())) return 'Lead, due time, and note are required.'; if (input.dueAt !== undefined && !isoDate(input.dueAt)) return 'dueAt must be a valid ISO date.'; if (input.priority !== undefined && !followUpPriorities.includes(input.priority as never)) return 'Invalid priority.'; if (input.status !== undefined && !followUpStatuses.includes(input.status as never)) return 'Invalid follow-up status.'; return null }
const visitDb = (input: Record<string, unknown>) => Object.fromEntries(Object.entries({ lead_id: input.lead, property_id: input.property, agent_id: input.agent, scheduled_at: input.scheduledAt, status: input.status, feedback: input.feedback, outcome: input.outcome, next_action: input.nextAction }).filter(([, value]) => value !== undefined))
const followUpDb = (input: Record<string, unknown>) => Object.fromEntries(Object.entries({ lead_id: input.lead, agent_id: input.agent, due_at: input.dueAt, priority: input.priority, note: input.note, status: input.status }).filter(([, value]) => value !== undefined))
async function relatedQuery(table: 'site_visits' | 'follow_ups', request: AuthenticatedRequest) { let query = db!.from(table).select('*'); if (!isManager(request)) query = query.eq('agent_id', request.user!.id); return query.order(table === 'site_visits' ? 'scheduled_at' : 'due_at', { ascending: true }) }
app.get('/api/site-visits', requireAuth, async (request: AuthenticatedRequest, response) => { if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' }); const { data, error } = await relatedQuery('site_visits', request); if (error) return response.status(500).json({ success: false, error: error.message }); response.json({ success: true, data: (data || []).map(fromDb) }) })
app.post('/api/site-visits', requireAuth, requireRole(...mutableRoles), async (request: AuthenticatedRequest, response) => { const input = request.body as Record<string, unknown>; const errorMessage = validVisit(input); if (errorMessage) return response.status(400).json({ success: false, error: errorMessage }); if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' }); const { data, error } = await db.from('site_visits').insert(visitDb({ ...input, agent: input.agent || request.user!.id })).select('*, lead:leads(*), property:properties(*)').single(); if (error) return response.status(400).json({ success: false, error: error.message }); response.status(201).json({ success: true, data: fromDb(data) }) })
app.put('/api/site-visits/:id', requireAuth, requireRole(...mutableRoles), async (request: AuthenticatedRequest, response) => { const input = request.body as Record<string, unknown>; const errorMessage = validVisit(input, true); if (errorMessage) return response.status(400).json({ success: false, error: errorMessage }); if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' }); let query = db.from('site_visits').update(visitDb(input)).eq('id', request.params.id); if (!isManager(request)) query = query.eq('agent_id', request.user!.id); const { data, error } = await query.select('*, lead:leads(*), property:properties(*)').single(); if (error || !data) return response.status(error ? 400 : 404).json({ success: false, error: error?.message || 'Site visit not found' }); response.json({ success: true, data: fromDb(data) }) })
app.delete('/api/site-visits/:id', requireAuth, requireRole('admin', 'broker'), async (request: AuthenticatedRequest, response) => { if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' }); const { error } = await db.from('site_visits').delete().eq('id', request.params.id); if (error) return response.status(400).json({ success: false, error: error.message }); response.status(204).end() })
app.get('/api/follow-ups', requireAuth, async (request: AuthenticatedRequest, response) => { if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' }); const { data, error } = await relatedQuery('follow_ups', request); if (error) return response.status(500).json({ success: false, error: error.message }); response.json({ success: true, data: (data || []).map(fromDb) }) })
app.post('/api/follow-ups', requireAuth, requireRole(...mutableRoles), async (request: AuthenticatedRequest, response) => { const input = request.body as Record<string, unknown>; const errorMessage = validFollowUp(input); if (errorMessage) return response.status(400).json({ success: false, error: errorMessage }); if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' }); const { data, error } = await db.from('follow_ups').insert(followUpDb({ ...input, agent: input.agent || request.user!.id })).select('*, lead:leads(*)').single(); if (error) return response.status(400).json({ success: false, error: error.message }); response.status(201).json({ success: true, data: fromDb(data) }) })
app.put('/api/follow-ups/:id', requireAuth, requireRole(...mutableRoles), async (request: AuthenticatedRequest, response) => { const input = request.body as Record<string, unknown>; const errorMessage = validFollowUp(input, true); if (errorMessage) return response.status(400).json({ success: false, error: errorMessage }); if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' }); let query = db.from('follow_ups').update(followUpDb(input)).eq('id', request.params.id); if (!isManager(request)) query = query.eq('agent_id', request.user!.id); const { data, error } = await query.select('*, lead:leads(*)').single(); if (error || !data) return response.status(error ? 400 : 404).json({ success: false, error: error?.message || 'Follow-up not found' }); response.json({ success: true, data: fromDb(data) }) })
app.delete('/api/follow-ups/:id', requireAuth, requireRole('admin', 'broker'), async (request: AuthenticatedRequest, response) => { if (!db) return response.status(503).json({ success: false, error: 'Database is not configured' }); const { error } = await db.from('follow_ups').delete().eq('id', request.params.id); if (error) return response.status(400).json({ success: false, error: error.message }); response.status(204).end() })
app.get('/api/protected', requireAuth, (request: AuthenticatedRequest, response) => response.json({ success: true, message: 'Protected resource', userId: request.user!.id, role: request.role }))
app.get('/api/admin', requireAuth, requireRole('admin'), (_request, response) => response.json({ success: true, message: 'Admin resource' }))
const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => { console.error('[api] Unhandled error:', error); response.status(500).json({ success: false, error: 'Internal server error' }) }
app.use(errorHandler)
app.listen(port, () => console.info(`[api] real-estate-api listening on port ${port}`))
