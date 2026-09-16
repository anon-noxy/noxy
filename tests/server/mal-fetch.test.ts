import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMalRetryDelay, malFetch, type MalEvent } from '../../server/utils/mal'

const createRuntimeConfig = (maxConcurrentRequests = '8') => ({
  malApiBaseUrl: 'https://api.example.test/v2',
  malClientId: 'test-client-id',
  malMaxConcurrentRequests: maxConcurrentRequests,
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MAL fetch resilience', () => {
  it('uses bounded retries with backoff for upstream requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ id: 1 })

    vi.stubGlobal('useRuntimeConfig', () => createRuntimeConfig())
    vi.stubGlobal('$fetch', fetchMock)

    await malFetch({} as MalEvent, '/anime/1', { fields: 'id,title' })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v2/anime/1',
      expect.objectContaining({
        method: 'GET',
        query: {
          fields: 'id,title',
        },
        retry: 2,
        timeout: 8_000,
      }),
    )

    const options = fetchMock.mock.calls[0]?.[1]

    expect(options.retryDelay({ options: { retry: 2 } })).toBe(250)
    expect(options.retryDelay({ options: { retry: 1 } })).toBe(500)
    expect(
      options.retryDelay({
        options: { retry: 2 },
        response: {
          headers: new Headers({
            'retry-after': '10',
          }),
        },
      }),
    ).toBe(2_000)
    expect(getMalRetryDelay(undefined)).toBe(250)
  })

  it('queues requests above the configured concurrency limit', async () => {
    const resolvers: Array<() => void> = []
    let activeRequests = 0
    let peakActiveRequests = 0
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          activeRequests += 1
          peakActiveRequests = Math.max(peakActiveRequests, activeRequests)
          resolvers.push(() => {
            activeRequests -= 1
            resolve({ ok: true })
          })
        }),
    )

    vi.stubGlobal('useRuntimeConfig', () => createRuntimeConfig('2'))
    vi.stubGlobal('$fetch', fetchMock)

    const requests = [
      malFetch({} as MalEvent, '/anime/1'),
      malFetch({} as MalEvent, '/anime/2'),
      malFetch({} as MalEvent, '/anime/3'),
    ]

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    resolvers.shift()?.()

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    resolvers.splice(0).forEach((resolve) => resolve())
    await Promise.all(requests)

    expect(peakActiveRequests).toBe(2)
  })
})
