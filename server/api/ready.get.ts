import { setResponseHeader, setResponseStatus } from 'h3'
import { getApiTrafficSnapshot } from '../utils/api-traffic'
import { setNoStoreHeaders, toPositiveIntegerConfig } from '../utils/resilience'

const defaultMaxConcurrentApiRequests = 80

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const snapshot = getApiTrafficSnapshot()
  const maxConcurrentRequests = toPositiveIntegerConfig(
    config.apiMaxConcurrentRequests,
    defaultMaxConcurrentApiRequests,
  )
  const checks = {
    acceptingTraffic: snapshot.activeRequests < maxConcurrentRequests,
    animeProviderConfigured: Boolean(config.malClientId),
  }
  const isReady = Object.values(checks).every(Boolean)

  setNoStoreHeaders(event)
  setResponseHeader(event, 'X-Noxy-Instance', snapshot.instanceId)

  if (!isReady) {
    setResponseStatus(event, 503, 'Service is not ready.')
  }

  return {
    ok: isReady,
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
    maxConcurrentRequests,
    ...snapshot,
  }
})
