import { describe, expect, it } from 'vitest'

import { useAnimeRelationFilters } from '../../app/composables/useAnimeRelationFilters'

describe('useAnimeRelationFilters', () => {
  const { excludeSeasonCollectionItems } = useAnimeRelationFilters()

  it('removes relations that are already displayed in the season collection', () => {
    const relations = [
      { id: 63832, relationType: 'SEQUEL' },
      { id: 70000, relationType: 'SIDE_STORY' },
    ]
    const seasons = [{ id: 60371 }, { id: 63832 }]

    expect(excludeSeasonCollectionItems(relations, seasons)).toEqual([{ id: 70000, relationType: 'SIDE_STORY' }])
  })

  it('returns no related items when every relation is already a season card', () => {
    const relations = [{ id: 60371 }, { id: 63832 }]

    expect(excludeSeasonCollectionItems(relations, relations)).toEqual([])
  })
})
