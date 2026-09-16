import { describe, expect, it } from 'vitest'

import { toMappedDetails, toMappedRelation, type MalAnime } from '../../server/utils/mal'

describe('MAL relation mapping', () => {
  it('hydrates sparse prequel relations with full season metadata', () => {
    const secondSeason: MalAnime = {
      id: 63832,
      title: 'Seihantai na Kimi to Boku 2nd Season',
      media_type: 'tv',
      related_anime: [
        {
          relation_type: 'prequel',
          node: {
            id: 60371,
            title: 'Seihantai na Kimi to Boku',
          },
        },
      ],
    }
    const firstSeason: MalAnime = {
      id: 60371,
      title: 'Seihantai na Kimi to Boku',
      media_type: 'tv',
      num_episodes: 12,
      start_date: '2026-01-11',
      start_season: {
        year: 2026,
        season: 'winter',
      },
      genres: [{ id: 22, name: 'Romance' }],
    }

    const sparsePrequel = toMappedDetails(secondSeason).relations.nodes[0]
    const hydratedPrequel = toMappedRelation(firstSeason, sparsePrequel?.relationType)

    expect(sparsePrequel).toMatchObject({
      id: 60371,
      format: 'ANIME',
      relationType: 'PREQUEL',
    })
    expect(hydratedPrequel).toMatchObject({
      id: 60371,
      format: 'TV',
      episodes: 12,
      genres: ['Romance'],
      season: 'WINTER',
      seasonYear: 2026,
      startDate: {
        year: 2026,
        month: 1,
        day: 11,
      },
      relationType: 'PREQUEL',
    })
  })
})
