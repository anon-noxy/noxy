import { describe, expect, it } from 'vitest'

import { toNextAiringEpisode, type MalAnime } from '../../server/utils/mal'

const releasingAnime = (overrides: Partial<MalAnime> = {}): MalAnime => ({
  id: 100,
  title: 'Scheduled Anime',
  status: 'currently_airing',
  start_date: '2026-08-03',
  num_episodes: 12,
  broadcast: {
    day_of_the_week: 'monday',
    start_time: '20:00',
  },
  ...overrides,
})

describe('MAL airing schedule estimates', () => {
  it('keeps the next episode unaired until the weekly broadcast time', () => {
    const currentTime = Date.parse('2026-08-31T10:00:00+09:00')
    const airingAt = Date.parse('2026-08-31T20:00:00+09:00')

    expect(toNextAiringEpisode(releasingAnime(), currentTime)).toEqual({
      airingAt: Math.floor(airingAt / 1000),
      episode: 5,
      timeUntilAiring: 10 * 60 * 60,
    })
  })

  it('advances the release count after the scheduled broadcast begins', () => {
    const currentTime = Date.parse('2026-08-31T21:00:00+09:00')
    const airingAt = Date.parse('2026-09-07T20:00:00+09:00')

    expect(toNextAiringEpisode(releasingAnime(), currentTime)).toEqual({
      airingAt: Math.floor(airingAt / 1000),
      episode: 6,
      timeUntilAiring: 6 * 24 * 60 * 60 + 23 * 60 * 60,
    })
  })

  it('stops creating scheduled episodes after the known finale', () => {
    const currentTime = Date.parse('2026-08-31T21:00:00+09:00')

    expect(toNextAiringEpisode(releasingAnime({ num_episodes: 5 }), currentTime)).toBeUndefined()
  })
})
