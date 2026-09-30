export const dealStages = ['New', 'Contacted', 'Interested', 'Site Visit', 'Negotiation', 'Booked', 'Closed', 'Lost'] as const
export type DealStage = typeof dealStages[number]
export const activeDealStages = dealStages.slice(0, 7)

export function isDealStage(value: unknown): value is DealStage {
  return typeof value === 'string' && (dealStages as readonly string[]).includes(value)
}

export function commissionFor(value: number, rate = 2): number {
  return Math.round(value * rate) / 100
}

export function propertyStatusFor(stage: DealStage, listingType: string): string | null {
  if (stage === 'Booked') return 'Booked'
  if (stage === 'Closed') return listingType === 'Rent' ? 'Rented' : 'Sold'
  if (stage === 'Lost') return 'Available'
  return null
}

export function validateDeal(input: Record<string, unknown>, partial = false): string | null {
  if (!partial && (!input.leadId || !input.propertyId)) return 'Lead and property are required.'
  if (input.stage !== undefined && !isDealStage(input.stage)) return 'Invalid deal stage.'
  if (input.dealValue !== undefined && (!Number.isFinite(Number(input.dealValue)) || Number(input.dealValue) <= 0)) return 'Deal value must be positive.'
  if (input.commissionRate !== undefined && (!Number.isFinite(Number(input.commissionRate)) || Number(input.commissionRate) < 0)) return 'Commission rate cannot be negative.'
  return null
}

export function canModifyDeal(role: string | undefined) {
  return role === 'admin' || role === 'broker' || role === 'agent'
}

export function dealDb(input: Record<string, unknown>, agentId?: string) {
  const dealValue = input.dealValue === undefined ? undefined : Number(input.dealValue)
  const rate = input.commissionRate === undefined ? 2 : Number(input.commissionRate)
  return Object.fromEntries(Object.entries({ lead_id: input.leadId, property_id: input.propertyId, agent_id: input.agentId || agentId, deal_value: dealValue, commission: dealValue === undefined ? undefined : commissionFor(dealValue, rate), status: input.stage, closed_at: input.stage === 'Closed' ? new Date().toISOString() : input.stage === 'Lost' ? null : undefined }).filter(([, value]) => value !== undefined))
}
