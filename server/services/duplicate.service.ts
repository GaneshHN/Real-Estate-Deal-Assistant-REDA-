export type LeadIdentity = {
  phone?: unknown
  email?: unknown
  source?: unknown
  sourceLeadId?: unknown
}

export type DuplicateLead = LeadIdentity & {
  id: string
  name: string
  status?: string | null
}

export type DuplicateMatch = {
  lead: DuplicateLead
  matchedOn: Array<'phone' | 'email' | 'sourceLeadId'>
}

export function normalizePhone(value: unknown) {
  return String(value ?? '').replace(/\D/g, '')
}

export function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase()
}

export function normalizeSourceLeadId(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase()
}

export function findDuplicateMatches(input: LeadIdentity, existing: DuplicateLead[]): DuplicateMatch[] {
  const phone = normalizePhone(input.phone)
  const email = normalizeEmail(input.email)
  const source = normalizeSourceLeadId(input.source)
  const sourceLeadId = normalizeSourceLeadId(input.sourceLeadId)

  return existing.map(lead => {
    const matchedOn: DuplicateMatch['matchedOn'] = []
    if (phone && normalizePhone(lead.phone) === phone) matchedOn.push('phone')
    if (email && normalizeEmail(lead.email) === email) matchedOn.push('email')
    if (source && sourceLeadId && normalizeSourceLeadId(lead.source) === source && normalizeSourceLeadId(lead.sourceLeadId) === sourceLeadId) matchedOn.push('sourceLeadId')
    return { lead, matchedOn }
  }).filter(match => match.matchedOn.length > 0)
}

export const duplicateWarning = 'Possible duplicate lead found.'
