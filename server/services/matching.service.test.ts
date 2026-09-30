import assert from 'node:assert/strict'
import test from 'node:test'
import { findMatches, matchScore, missingRequirements } from './matching.service'
import type { Property } from '../../shared/types'

const property = { propertyType: 'Apartment', location: 'Indiranagar', price: 8000000, area: 1200 } as Property

test('scores an exact match at 100', () => {
  assert.equal(matchScore({ id: 'l1', name: 'A', propertyType: 'Apartment', preferredLocation: 'Indiranagar', budgetMax: 8000000, minArea: 1200 }, property), 100)
})
test('supports partial and case-insensitive location matches', () => {
  const matches = findMatches({ id: 'l1', name: 'A', propertyType: 'Villa', preferredLocation: 'indiranagar', budgetMax: 7000000, minArea: 1500 }, [property])
  assert.equal(matches[0].score, 30)
  assert.deepEqual(matches[0].reasons, ['Location matched'])
})
test('reports missing requirements', () => {
  assert.deepEqual(missingRequirements({ id: 'l1', name: 'A' }), ['property type', 'preferred location', 'maximum budget', 'minimum area'])
})
