import type { Property, PropertyType } from '../../shared/types'

export type LeadRequirements = {
  id: string
  name: string
  propertyType?: PropertyType | null
  preferredLocation?: string | null
  budgetMax?: number | null
  minArea?: number | null
}

export type PropertyMatch = {
  property: Property
  score: number
  reasons: string[]
}

const normalize = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase()

export function matchScore(lead: LeadRequirements, property: Property) {
  let score = 0
  if (lead.propertyType && property.propertyType === lead.propertyType) score += 30
  if (lead.preferredLocation && normalize(property.location) === normalize(lead.preferredLocation)) score += 30
  if (lead.budgetMax != null && Number.isFinite(Number(lead.budgetMax)) && property.price <= Number(lead.budgetMax)) score += 25
  if (lead.minArea != null && Number.isFinite(Number(lead.minArea)) && property.area >= Number(lead.minArea)) score += 15
  return score
}

export function matchProperty(lead: LeadRequirements, property: Property): PropertyMatch {
  const reasons: string[] = []
  if (lead.propertyType && property.propertyType === lead.propertyType) reasons.push('Property type matched')
  if (lead.preferredLocation && normalize(property.location) === normalize(lead.preferredLocation)) reasons.push('Location matched')
  if (lead.budgetMax != null && property.price <= Number(lead.budgetMax)) reasons.push('Within budget')
  if (lead.minArea != null && property.area >= Number(lead.minArea)) reasons.push('Area requirement satisfied')
  return { property, score: matchScore(lead, property), reasons }
}

export function findMatches(lead: LeadRequirements, properties: Property[]) {
  return properties.map(property => matchProperty(lead, property)).sort((a, b) => b.score - a.score)
}

export const missingRequirements = (lead: LeadRequirements) => [
  !lead.propertyType && 'property type',
  !lead.preferredLocation && 'preferred location',
  (lead.budgetMax == null || !Number.isFinite(Number(lead.budgetMax))) && 'maximum budget',
  (lead.minArea == null || !Number.isFinite(Number(lead.minArea))) && 'minimum area',
].filter(Boolean) as string[]
