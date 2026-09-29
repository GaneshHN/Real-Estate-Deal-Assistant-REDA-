import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { findDuplicateMatches, normalizeEmail, normalizePhone } from './duplicate.service'

const lead = { id: '1', name: 'Existing Customer', phone: '+91 98765-43210', email: 'Existing@Example.com', source: '99acres', sourceLeadId: 'PORTAL-7', status: 'Contacted' }

describe('duplicate lead detection', () => {
  it('matches the same phone despite formatting differences', () => assert.ok(findDuplicateMatches({ phone: '+91 (987) 654-3210' }, [lead])[0].matchedOn.includes('phone')))
  it('matches the same email case insensitively', () => assert.ok(findDuplicateMatches({ email: ' existing@example.com ' }, [lead])[0].matchedOn.includes('email')))
  it('matches the same source portal lead id', () => assert.ok(findDuplicateMatches({ source: '99ACRES', sourceLeadId: ' portal-7 ' }, [lead])[0].matchedOn.includes('sourceLeadId')))
  it('does not match different customers', () => assert.equal(findDuplicateMatches({ phone: '1111111111', email: 'other@example.com', source: 'Website', sourceLeadId: '9' }, [lead]).length, 0))
  it('ignores missing phone and email', () => assert.equal(findDuplicateMatches({ phone: '', email: null }, [lead]).length, 0))
  it('normalizes identity values', () => { assert.equal(normalizePhone('+1 (555) 123-4567'), '15551234567'); assert.equal(normalizeEmail(' A@B.COM '), 'a@b.com') })
})
