import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAniListAnimeSupplement, fetchAniListReleasedEpisodeCounts } from '../../server/utils/anilist'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AniList anime supplement', () => {
  it('maps streaming episode titles for the watch page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      data: {
        Media: {
          bannerImage: ' https://images.example.test/banner.jpg ',
          streamingEpisodes: [
            {
              title: ' Episode 1 - Tiger and Dragon ',
              url: ' https://stream.example.test/1 ',
              site: ' Crunchyroll ',
              thumbnail: ' https://images.example.test/episode-1.jpg ',
            },
            {
              title: ' ',
              url: 'https://stream.example.test/missing-title',
            },
          ],
        },
      },
    })

    vi.stubGlobal('$fetch', fetchMock)

    await expect(fetchAniListAnimeSupplement(4224)).resolves.toEqual({
      bannerImage: 'https://images.example.test/banner.jpg',
      streamingEpisodes: [
        {
          title: 'Episode 1 - Tiger and Dragon',
          url: 'https://stream.example.test/1',
          site: 'Crunchyroll',
          thumbnail: 'https://images.example.test/episode-1.jpg',
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://graphql.anilist.co',
      expect.objectContaining({
        method: 'POST',
        retry: 1,
        retryDelay: 250,
        timeout: 4_000,
      }),
    )

    const requestBody = fetchMock.mock.calls[0]?.[1]?.body

    expect(requestBody.variables).toEqual({ idMal: 4224 })
    expect(requestBody.query).toContain('streamingEpisodes')
  })

  it('falls back to empty optional metadata when AniList is unavailable', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('upstream unavailable')))

    await expect(fetchAniListAnimeSupplement(4224)).resolves.toEqual({
      bannerImage: '',
      streamingEpisodes: [],
    })
  })

  it('skips invalid MAL ids', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('$fetch', fetchMock)

    await expect(fetchAniListAnimeSupplement(0)).resolves.toEqual({
      bannerImage: '',
      streamingEpisodes: [],
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('AniList released episode counts', () => {
  it('uses the next airing episode for currently releasing anime', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      data: {
        anime0: {
          idMal: 21,
          status: 'RELEASING',
          episodes: null,
          nextAiringEpisode: {
            episode: 1178,
          },
        },
        anime1: {
          idMal: 52991,
          status: 'FINISHED',
          episodes: 28,
          nextAiringEpisode: null,
        },
        anime2: {
          idMal: 58945,
          status: 'NOT_YET_RELEASED',
          episodes: 12,
          nextAiringEpisode: null,
        },
      },
    })

    vi.stubGlobal('$fetch', fetchMock)

    await expect(fetchAniListReleasedEpisodeCounts([21, 52991, 58945, 21, 0])).resolves.toEqual(
      new Map([
        [21, 1177],
        [52991, 28],
        [58945, 0],
      ]),
    )

    const requestBody = fetchMock.mock.calls[0]?.[1]?.body

    expect(requestBody.query).toContain('anime0: Media(idMal: 21')
    expect(requestBody.query).toContain('nextAiringEpisode')
  })

  it('falls back to no overrides when episode availability is unavailable', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('upstream unavailable')))

    await expect(fetchAniListReleasedEpisodeCounts([21])).resolves.toEqual(new Map())
  })

  it('skips invalid MAL ids', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('$fetch', fetchMock)

    await expect(fetchAniListReleasedEpisodeCounts([0, -1, Number.NaN])).resolves.toEqual(new Map())
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
