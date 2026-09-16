import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAnimeHoverDetails, type AnimeHoverDetails } from '../../app/composables/useAnimeHoverDetails'

describe('useAnimeHoverDetails', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '$fetch')
  })

  it('fetches hover details once and reuses the cache', async () => {
    const details: AnimeHoverDetails = {
      id: 9101,
      title: {
        english: 'Cached Anime',
      },
    }
    const fetchMock = vi.fn().mockResolvedValue(details)

    Object.assign(globalThis, { $fetch: fetchMock })

    const { getAnimeHoverDetails } = useAnimeHoverDetails()

    await expect(getAnimeHoverDetails(details.id)).resolves.toBe(details)
    await expect(getAnimeHoverDetails(details.id)).resolves.toBe(details)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/myanimelist/hover/9101')
  })

  it('deduplicates matching requests while they are in flight', async () => {
    const details: AnimeHoverDetails = {
      id: 9102,
      title: {
        romaji: 'Shared Request',
      },
    }
    let resolveRequest: (value: AnimeHoverDetails) => void = () => {}
    const fetchMock = vi.fn(
      () =>
        new Promise<AnimeHoverDetails>((resolve) => {
          resolveRequest = resolve
        }),
    )

    Object.assign(globalThis, { $fetch: fetchMock })

    const { getAnimeHoverDetails } = useAnimeHoverDetails()
    const firstRequest = getAnimeHoverDetails(details.id)
    const secondRequest = getAnimeHoverDetails(details.id)

    resolveRequest(details)

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([details, details])
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('puts failed requests on cooldown', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network down'))

    Object.assign(globalThis, { $fetch: fetchMock })

    const { getAnimeHoverDetails } = useAnimeHoverDetails()

    await expect(getAnimeHoverDetails(9103)).rejects.toThrow('Network down')
    await expect(getAnimeHoverDetails(9103)).rejects.toThrow('cooling down')

    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
