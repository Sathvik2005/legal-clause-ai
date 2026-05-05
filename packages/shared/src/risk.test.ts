import test from 'node:test'
import assert from 'node:assert/strict'
import { clauseFingerprint, scoreRisk } from './legal.js'

test('clause fingerprint is stable', () => {
  const a = clauseFingerprint('Party shall indemnify the other party.', 'indemnity', 'US')
  const b = clauseFingerprint(' Party shall indemnify   the other party. ', 'indemnity', 'US')
  assert.equal(a, b)
})

test('risk score increases with more contributions', () => {
  const low = scoreRisk([0.1, 0.2], 2)
  const high = scoreRisk([0.8, 0.9, 0.7], 3)
  assert.ok(high > low)
})
