import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNoxyLoadingIndicator } from '../../app/composables/useNoxyLoadingIndicator'

describe('useNoxyLoadingIndicator', () => {
  const start = vi.fn()
  const finish = vi.fn()

  beforeEach(() => {
    start.mockClear()
    finish.mockClear()

    Object.assign(globalThis, {
      useLoadingIndicator: vi.fn((options) => ({
        ...options,
        start,
        finish,
        isLoading: false,
        progress: 0,
      })),
    })
  })

  it('wraps successful async work with start and finish', async () => {
    const loading = useNoxyLoadingIndicator()

    await expect(loading.runWithLoading(async () => 'loaded')).resolves.toBe('loaded')

    expect(start).toHaveBeenCalledOnce()
    expect(finish).toHaveBeenCalledOnce()
  })

  it('finishes the indicator when async work fails', async () => {
    const loading = useNoxyLoadingIndicator()

    await expect(
      loading.runWithLoading(async () => {
        throw new Error('Unable to load')
      }),
    ).rejects.toThrow('Unable to load')

    expect(start).toHaveBeenCalledOnce()
    expect(finish).toHaveBeenCalledOnce()
  })

  it('uses the shared loading timing settings', () => {
    const loading = useNoxyLoadingIndicator()

    expect(loading.duration).toBe(3000)
    expect(loading.throttle).toBe(120)
    expect(loading.estimatedProgress(3000, 0)).toBe(0)
    expect(loading.estimatedProgress(3000, 3000)).toBeGreaterThan(50)
  })
})
