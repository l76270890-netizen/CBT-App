import assert from 'node:assert/strict'
import test from 'node:test'
import {
  RENEWAL_WARNING_MS,
  formatRemaining,
  isSubscriptionBlockedError,
  parseSubscriptionStatus,
  tickSubscriptionStatus,
} from '../src/subscription.ts'

const NOW = Date.parse('2026-11-10T12:00:00.000Z')

test('parses an absolute expiry and flags the 5 hour warning window', () => {
  const status = parseSubscriptionStatus({ expires_at: '2026-11-10T17:00:00.000Z' }, NOW)
  assert.ok(status)
  assert.equal(status.active, true)
  assert.equal(status.expired, false)
  assert.equal(status.remainingMs, RENEWAL_WARNING_MS)
  assert.equal(status.expiringSoon, true)
})

test('does not warn while more than 5 hours remain', () => {
  const status = parseSubscriptionStatus({ expires_at: '2026-11-10T17:00:01.000Z' }, NOW)
  assert.ok(status)
  assert.equal(status.expiringSoon, false)
})

test('anchors relative countdowns to the server clock', () => {
  const status = parseSubscriptionStatus(
    { remaining_seconds: 3600, server_time: '2026-11-10T12:00:00.000Z' },
    NOW + 10 * 60 * 1000,
  )
  assert.ok(status)
  assert.equal(status.remainingMs, 60 * 60 * 1000)
  assert.equal(status.expiringSoon, true)
})

test('marks a lapsed subscription as expired and inactive', () => {
  const status = parseSubscriptionStatus({ expires_at: '2026-11-10T11:59:59.000Z' }, NOW)
  assert.ok(status)
  assert.equal(status.active, false)
  assert.equal(status.expired, true)
  assert.equal(status.remainingMs, 0)
  assert.equal(status.expiringSoon, false)
})

test('honours an explicit expired flag without countdown data', () => {
  const status = parseSubscriptionStatus({ expired: true, plan: 'monthly' }, NOW)
  assert.ok(status)
  assert.equal(status.expired, true)
  assert.equal(status.active, false)
  assert.equal(status.plan, 'monthly')
})

test('returns null for payloads without any status information', () => {
  assert.equal(parseSubscriptionStatus({}, NOW), null)
  assert.equal(parseSubscriptionStatus(null, NOW), null)
})

test('ticking the countdown expires the subscription at zero', () => {
  const status = parseSubscriptionStatus({ remaining_seconds: 2 }, NOW)
  assert.ok(status)
  const afterOne = tickSubscriptionStatus(status, 1000)
  assert.equal(afterOne.active, true)
  assert.equal(afterOne.remainingMs, 1000)
  const afterTwo = tickSubscriptionStatus(afterOne, 1000)
  assert.equal(afterTwo.active, false)
  assert.equal(afterTwo.expired, true)
  assert.equal(afterTwo.expiringSoon, false)
})

test('formats the countdown as HH:MM:SS', () => {
  assert.equal(formatRemaining(5 * 60 * 60 * 1000), '05:00:00')
  assert.equal(formatRemaining(61_000), '00:01:01')
  assert.equal(formatRemaining(-500), '00:00:00')
})

test('only a subscription-expiry 403 counts as a subscription block', () => {
  assert.equal(isSubscriptionBlockedError({ status: 403, code: 'subscription_expired' }), true)
  assert.equal(isSubscriptionBlockedError({ status: 403, code: 'account_unavailable', message: 'Your subscription has expired.' }), true)
  assert.equal(isSubscriptionBlockedError({ status: 403, message: 'Your subscription has expired. Please renew to continue.' }), true)
  assert.equal(isSubscriptionBlockedError({ status: 403 }), false)
  assert.equal(isSubscriptionBlockedError({ status: 403, code: 'forbidden' }), false)
  assert.equal(isSubscriptionBlockedError({ status: 403, code: 'invalid_origin' }), false)
  assert.equal(isSubscriptionBlockedError({ status: 403, message: 'You can only read your own history.' }), false)
  assert.equal(isSubscriptionBlockedError({ status: 401 }), false)
  assert.equal(isSubscriptionBlockedError(new Error('boom')), false)
})

