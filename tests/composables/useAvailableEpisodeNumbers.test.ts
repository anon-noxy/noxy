import { describe, expect, it } from 'vitest'

import { getAvailableEpisodeCount, getAvailableEpisodeNumbers } from '../../app/composables/useAvailableEpisodeNumbers'

describe('getAvailableEpisodeNumbers', () => {
  it('returns an empty list for missing or unreleased media', () => {
    expect(getAvailableEpisodeNumbers()).toEqual([])
    expect(getAvailableEpisodeNumbers({ status: 'NOT_YET_RELEASED', episodes: 12 })).toEqual([])
  })

  it('builds a complete range from a known episode count', () => {
    expect(getAvailableEpisodeNumbers({ episodes: 3 })).toEqual([1, 2, 3])
  })

  it('uses next airing episode to count released episodes', () => {
    expect(getAvailableEpisodeNumbers({ status: 'RELEASING', nextAiringEpisode: { episode: 5 } })).toEqual([1, 2, 3, 4])
    expect(getAvailableEpisodeCount({ status: 'RELEASING', episodes: 14, nextAiringEpisode: { episode: 5 } })).toBe(4)
    expect(getAvailableEpisodeCount({ status: 'RELEASING', episodes: 12, nextAiringEpisode: { episode: 9 } })).toBe(8)
  })

  it('caps finished anime to the known episode count when streaming links include unrelated extras', () => {
    expect(
      getAvailableEpisodeNumbers({
        status: 'FINISHED',
        episodes: 4,
        streamingEpisodes: Array.from({ length: 12 }, (_, index) => ({
          title: `Episode ${index + 1}`,
          url: `/watch/${index + 1}`,
        })),
      }),
    ).toEqual([1, 2, 3, 4])
  })

  it('caps releasing anime to already released episodes when future or unrelated links leak in', () => {
    expect(
      getAvailableEpisodeNumbers({
        status: 'RELEASING',
        episodes: 12,
        nextAiringEpisode: { episode: 5 },
        streamingEpisodes: Array.from({ length: 12 }, (_, index) => ({
          title: `Episode ${index + 1}`,
          url: `/watch/${index + 1}`,
        })),
      }),
    ).toEqual([1, 2, 3, 4])
  })

  it('uses listed streaming episodes for releasing anime when next airing data is unavailable', () => {
    expect(
      getAvailableEpisodeNumbers({
        status: 'RELEASING',
        episodes: 12,
        streamingEpisodes: [
          { title: 'Episode 1', url: '/watch/1' },
          { title: 'Episode 2', url: '/watch/2' },
          { title: 'Episode 3', url: '/watch/3' },
        ],
      }),
    ).toEqual([1, 2, 3])
  })

  it('parses, deduplicates, and sorts streaming episode titles', () => {
    expect(
      getAvailableEpisodeNumbers({
        streamingEpisodes: [
          { title: 'Episode 03', url: '/watch/3' },
          { title: 'Ep. 1', url: '/watch/1' },
          { title: '#2', url: '/watch/2' },
          { title: 'Episode 03', url: '/watch/3-alt' },
          { title: 'Episode 99' },
        ],
      }),
    ).toEqual([1, 2, 3])
  })

  it('prefers a complete known range when listed episodes are incomplete', () => {
    expect(
      getAvailableEpisodeNumbers({
        episodes: 4,
        streamingEpisodes: [
          { title: 'Episode 2', url: '/watch/2' },
          { title: 'Episode 4', url: '/watch/4' },
        ],
      }),
    ).toEqual([1, 2, 3, 4])
  })
})
