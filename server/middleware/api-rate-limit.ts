import { createError, defineEventHandler, getRequestURL, setResponseHeader } from 'h3'
import { getApiTrafficSnapshot, tryAcquireApiRequestSlot } from '../utils/api-traffic'
import {
  createServiceUnavailableError,
  getForwardedClientIp,
  setRetryAfter,
  toBooleanConfig,
  toPositiveIntegerConfig,
  toPositiveNumberConfig,
} from '../utils/resilience'

type RateLimitRule = {
  max: number
  windowMs: number
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()
let lastCleanupAt = 0

const minute = 60 * 1000
const defaultMaxConcurrentApiRequests = 80
const defaultRateLimitMultiplier = 1
const defaultNonCriticalLoadShedThreshold = 0.75
const overloadRetryAfterSeconds = 5
const disabledFeatureRetryAfterSeconds = 60

const healthCheckPaths = new Set(['/api/health', '/api/ready'])
const nonCriticalApiPathPrefixes = [
  '/api/news',
  '/api/myanimelist/home-discover',
  '/api/myanimelist/home-lists',
  '/api/myanimelist/hover',
  '/api/myanimelist/random',
  '/api/myanimelist/schedule',
  '/api/myanimelist/spotlight',
  '/api/myanimelist/trending',
]

const applyRateLimitMultiplier = (rule: RateLimitRule, multiplier: number): RateLimitRule => ({
  ...rule,
  max: Math.max(Math.floor(rule.max * multiplier), 1),
})

export const isApiHealthCheckPath = (path: string) => healthCheckPaths.has(path)

export const isNonCriticalApiPath = (path: string) => {
  return nonCriticalApiPathPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export const getRateLimitRule = (
  path: string,
  method: string,
  multiplier = defaultRateLimitMultiplier,
): RateLimitRule | null => {
  if (!path.startsWith('/api/')) {
    return null
  }

  if (isApiHealthCheckPath(path)) {
    return null
  }

  const normalizedMultiplier = toPositiveNumberConfig(multiplier, defaultRateLimitMultiplier)

  if (method !== 'GET') {
    return applyRateLimitMultiplier({ max: 30, windowMs: minute }, normalizedMultiplier)
  }

  if (path.startsWith('/api/myanimelist/search') || path.startsWith('/api/myanimelist/filter')) {
    return applyRateLimitMultiplier({ max: 45, windowMs: minute }, normalizedMultiplier)
  }

  if (path.startsWith('/api/myanimelist/random')) {
    return applyRateLimitMultiplier({ max: 20, windowMs: minute }, normalizedMultiplier)
  }

  if (path.startsWith('/api/myanimelist/')) {
    return applyRateLimitMultiplier({ max: 120, windowMs: minute }, normalizedMultiplier)
  }

  return applyRateLimitMultiplier({ max: 80, windowMs: minute }, normalizedMultiplier)
}

const cleanupBuckets = (now: number) => {
  if (now - lastCleanupAt < minute) {
    return
  }

  lastCleanupAt = now

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const method = event.node.req.method || 'GET'
  const config = useRuntimeConfig(event)
  const rateLimitMultiplier = toPositiveNumberConfig(config.apiRateLimitMultiplier, defaultRateLimitMultiplier)
  const rule = getRateLimitRule(url.pathname, method, rateLimitMultiplier)
  const isNonCriticalPath = isNonCriticalApiPath(url.pathname)
  const maxConcurrentRequests = toPositiveIntegerConfig(
    config.apiMaxConcurrentRequests,
    defaultMaxConcurrentApiRequests,
  )

  if (!rule) {
    return
  }

  if (toBooleanConfig(config.disableNonCriticalFeatures) && isNonCriticalPath) {
    setRetryAfter(event, disabledFeatureRetryAfterSeconds)
    setResponseHeader(event, 'X-Noxy-Feature-Disabled', '1')

    throw createServiceUnavailableError('This feature is temporarily disabled.')
  }

  const loadShedThreshold = Math.min(
    toPositiveNumberConfig(config.nonCriticalLoadShedThreshold, defaultNonCriticalLoadShedThreshold),
    1,
  )
  const nonCriticalActiveRequestLimit = Math.max(Math.floor(maxConcurrentRequests * loadShedThreshold), 1)
  const snapshotBeforeAcquisition = getApiTrafficSnapshot()

  if (isNonCriticalPath && snapshotBeforeAcquisition.activeRequests >= nonCriticalActiveRequestLimit) {
    setRetryAfter(event, overloadRetryAfterSeconds)
    setResponseHeader(event, 'X-Noxy-Active-Requests', String(snapshotBeforeAcquisition.activeRequests))
    setResponseHeader(event, 'X-Noxy-Instance', snapshotBeforeAcquisition.instanceId)
    setResponseHeader(event, 'X-Noxy-Load-Shed', 'non-critical')

    throw createServiceUnavailableError('This optional feature is temporarily unavailable.')
  }

  const now = Date.now()
  const ip = getForwardedClientIp(event)
  const key = `${ip}:${method}:${url.pathname}`
  const current = buckets.get(key)
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + rule.windowMs }

  bucket.count += 1
  buckets.set(key, bucket)
  cleanupBuckets(now)

  const remaining = Math.max(rule.max - bucket.count, 0)
  const resetSeconds = Math.ceil(bucket.resetAt / 1000)

  setResponseHeader(event, 'X-RateLimit-Limit', String(rule.max))
  setResponseHeader(event, 'X-RateLimit-Remaining', String(remaining))
  setResponseHeader(event, 'X-RateLimit-Reset', String(resetSeconds))
  setResponseHeader(event, 'X-RateLimit-Scope', 'instance')

  if (bucket.count > rule.max) {
    const retryAfter = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1)

    setRetryAfter(event, retryAfter)

    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.',
    })
  }

  const releaseApiRequestSlot = tryAcquireApiRequestSlot(maxConcurrentRequests)

  if (!releaseApiRequestSlot) {
    const snapshot = getApiTrafficSnapshot()

    setRetryAfter(event, overloadRetryAfterSeconds)
    setResponseHeader(event, 'X-Noxy-Active-Requests', String(snapshot.activeRequests))
    setResponseHeader(event, 'X-Noxy-Instance', snapshot.instanceId)
    setResponseHeader(event, 'X-Noxy-Overloaded', '1')

    throw createServiceUnavailableError('Service is busy. Please try again shortly.')
  }

  const snapshot = getApiTrafficSnapshot()
  let isReleased = false
  const releaseOnce = () => {
    if (isReleased) return

    isReleased = true
    releaseApiRequestSlot()
  }

  setResponseHeader(event, 'X-Noxy-Active-Requests', String(snapshot.activeRequests))
  setResponseHeader(event, 'X-Noxy-Instance', snapshot.instanceId)
  event.node.res.once('finish', releaseOnce)
  event.node.res.once('close', releaseOnce)
})
