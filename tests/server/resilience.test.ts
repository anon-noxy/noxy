import { describe, expect, it } from 'vitest'
import { getRateLimitRule, isApiHealthCheckPath, isNonCriticalApiPath } from '../../server/middleware/api-rate-limit'
import {
  getErrorRetryAfterSeconds,
  getErrorStatusCode,
  isTransientUpstreamError,
  toBooleanConfig,
  toPositiveIntegerConfig,
} from '../../server/utils/resilience'

describe('API resilience helpers', () => {
  it('exempts load-balancer health checks from rate limiting', () => {
    expect(isApiHealthCheckPath('/api/health')).toBe(true)
    expect(isApiHealthCheckPath('/api/ready')).toBe(true)
    expect(getRateLimitRule('/api/health', 'GET')).toBeNull()
  })

  it('identifies non-critical features that can be disabled during incidents', () => {
    expect(isNonCriticalApiPath('/api/news')).toBe(true)
    expect(isNonCriticalApiPath('/api/myanimelist/hover/1')).toBe(true)
    expect(isNonCriticalApiPath('/api/myanimelist/search')).toBe(false)
  })

  it('applies a rate-limit multiplier without dropping below one request', () => {
    expect(getRateLimitRule('/api/myanimelist/random', 'GET', 2)?.max).toBe(40)
    expect(getRateLimitRule('/api/myanimelist/random', 'GET', 0.01)?.max).toBe(1)
  })

  it('normalizes runtime config values', () => {
    expect(toBooleanConfig('true')).toBe(true)
    expect(toBooleanConfig('0')).toBe(false)
    expect(toPositiveIntegerConfig('12.8', 5)).toBe(12)
    expect(toPositiveIntegerConfig('nope', 5)).toBe(5)
  })

  it('classifies transient upstream failures as 503 candidates', () => {
    expect(getErrorStatusCode({ response: { status: 429 } })).toBe(429)
    expect(getErrorRetryAfterSeconds({ response: { headers: { 'retry-after': '15' } } })).toBe(15)
    expect(isTransientUpstreamError({ response: { status: 500 } })).toBe(true)
    expect(isTransientUpstreamError({ response: { status: 404 } })).toBe(false)
  })
})
