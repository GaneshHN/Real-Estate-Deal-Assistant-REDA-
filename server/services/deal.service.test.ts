import { describe, expect, it } from 'vitest'
import { commissionFor, dealDb, propertyStatusFor, validateDeal } from './deal.service'

describe('deal pipeline', () => {
  it('calculates and stores commission', () => { expect(commissionFor(1250000, 2.5)).toBe(31250); expect(dealDb({ leadId: 'l', propertyId: 'p', dealValue: 1250000, commissionRate: 2.5, stage: 'New' })).toMatchObject({ deal_value: 1250000, commission: 31250, status: 'New' }) })
  it('maps closing and booking to property status', () => { expect(propertyStatusFor('Closed', 'Sale')).toBe('Sold'); expect(propertyStatusFor('Closed', 'Rent')).toBe('Rented'); expect(propertyStatusFor('Booked', 'Sale')).toBe('Booked') })
  it('returns a property to available when a deal is lost', () => { expect(propertyStatusFor('Lost', 'Sale')).toBe('Available') })
  it('validates stage changes', () => { expect(validateDeal({ stage: 'Negotiation' }, true)).toBeNull(); expect(validateDeal({ stage: 'Unknown' }, true)).toBe('Invalid deal stage.') })
})
