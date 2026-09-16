type ReleaseApiRequestSlot = () => void

const startedAt = Date.now()
const instanceId = process.env.NOXY_INSTANCE_ID || process.env.HOSTNAME || `pid-${process.pid}`

let activeApiRequests = 0
let totalOverloadRejections = 0

export const tryAcquireApiRequestSlot = (maxConcurrentRequests: number): ReleaseApiRequestSlot | null => {
  const safeMaxConcurrentRequests = Math.max(Math.trunc(maxConcurrentRequests), 1)

  if (activeApiRequests >= safeMaxConcurrentRequests) {
    totalOverloadRejections += 1
    return null
  }

  activeApiRequests += 1

  let isReleased = false

  return () => {
    if (isReleased) return

    isReleased = true
    activeApiRequests = Math.max(activeApiRequests - 1, 0)
  }
}

export const getApiTrafficSnapshot = () => {
  const now = Date.now()

  return {
    activeRequests: activeApiRequests,
    instanceId,
    startedAt: new Date(startedAt).toISOString(),
    totalOverloadRejections,
    uptimeSeconds: Math.max(Math.floor((now - startedAt) / 1000), 0),
  }
}

export const resetApiTrafficForTests = () => {
  activeApiRequests = 0
  totalOverloadRejections = 0
}
