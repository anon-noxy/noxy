import { beforeEach, describe, expect, it } from 'vitest'
import {
  getApiTrafficSnapshot,
  resetApiTrafficForTests,
  tryAcquireApiRequestSlot,
} from '../../server/utils/api-traffic'

describe('API traffic tracking', () => {
  beforeEach(() => {
    resetApiTrafficForTests()
  })

  it('rejects requests over the per-instance concurrency limit', () => {
    const release = tryAcquireApiRequestSlot(1)

    expect(release).toBeTypeOf('function')
    expect(tryAcquireApiRequestSlot(1)).toBeNull()
    expect(getApiTrafficSnapshot()).toMatchObject({
      activeRequests: 1,
      totalOverloadRejections: 1,
    })

    release?.()

    expect(getApiTrafficSnapshot().activeRequests).toBe(0)
  })

  it('only releases a request slot once', () => {
    const release = tryAcquireApiRequestSlot(2)

    release?.()
    release?.()

    expect(getApiTrafficSnapshot().activeRequests).toBe(0)
  })
})
