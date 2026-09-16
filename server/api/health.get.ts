import { setResponseHeader } from 'h3'
import { getApiTrafficSnapshot } from '../utils/api-traffic'
import { setNoStoreHeaders } from '../utils/resilience'

export default defineEventHandler((event) => {
  const snapshot = getApiTrafficSnapshot()

  setNoStoreHeaders(event)
  setResponseHeader(event, 'X-Noxy-Instance', snapshot.instanceId)

  return {
    ok: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    ...snapshot,
  }
})
