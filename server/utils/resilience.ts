import { createError, getHeader, setResponseHeader, type H3Event } from 'h3'

type ErrorWithStatus = {
  response?: {
    status?: number
    statusText?: string
    headers?: Headers | Record<string, string | undefined>
  }
  status?: number
  statusCode?: number
  statusMessage?: string
  message?: string
}

const truthyConfigValues = new Set(['1', 'true', 'yes', 'on'])

export const toBooleanConfig = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  if (typeof value !== 'string') return fallback

  const normalizedValue = value.trim().toLowerCase()

  if (!normalizedValue) return fallback

  return truthyConfigValues.has(normalizedValue)
}

export const toPositiveIntegerConfig = (value: unknown, fallback: number) => {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) && numberValue > 0 ? Math.trunc(numberValue) : fallback
}

export const toPositiveNumberConfig = (value: unknown, fallback: number) => {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback
}

export const getForwardedClientIp = (event: H3Event) => {
  const forwardedFor = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = getHeader(event, 'x-real-ip')?.trim()
  const cfIp = getHeader(event, 'cf-connecting-ip')?.trim()
  const flyIp = getHeader(event, 'fly-client-ip')?.trim()
  const vercelForwardedFor = getHeader(event, 'x-vercel-forwarded-for')?.split(',')[0]?.trim()

  return (
    cfIp || flyIp || vercelForwardedFor || realIp || forwardedFor || event.node.req.socket?.remoteAddress || 'unknown'
  )
}

export const getErrorStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined

  const maybeError = error as ErrorWithStatus

  return maybeError.statusCode || maybeError.status || maybeError.response?.status
}

export const getErrorRetryAfterSeconds = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined

  const headers = (error as ErrorWithStatus).response?.headers
  const value = headers instanceof Headers ? headers.get('retry-after') : headers?.['retry-after']
  const retryAfter = Number(value)

  return Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : undefined
}

export const isTransientUpstreamError = (error: unknown) => {
  const statusCode = getErrorStatusCode(error)

  return !statusCode || statusCode === 408 || statusCode === 429 || statusCode >= 500
}

export const setRetryAfter = (event: H3Event, seconds: number) => {
  setResponseHeader(event, 'Retry-After', Math.max(Math.ceil(seconds), 1))
}

export const setNoStoreHeaders = (event: H3Event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
}

export const createServiceUnavailableError = (
  statusMessage = 'Service is temporarily unavailable. Please try again shortly.',
) => {
  return createError({
    statusCode: 503,
    statusMessage,
  })
}
