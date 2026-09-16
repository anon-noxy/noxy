import { describe, expect, it } from 'vitest'
import { getSearchTitleMatch, isSearchTitleMatch } from '../../server/utils/search-match'
import type { MalAnime } from '../../server/utils/mal'

const anime = (
  title: string,
  alternatives: {
    en?: string
    ja?: string
    synonyms?: string[]
  } = {},
): MalAnime => ({
  id: 1,
  title,
  alternative_titles: alternatives,
})

describe('filter search title matching', () => {
  it('matches the visible card title from the search input', () => {
    const match = getSearchTitleMatch(anime('Gotoubun no Hanayome', { en: 'The Quintessential Quintuplets' }), 'quint')

    expect(match).toEqual({
      matchedTitle: 'The Quintessential Quintuplets',
      sortTitle: 'The Quintessential Quintuplets',
    })
  })

  it('falls back to romaji titles when the visible title does not include the query', () => {
    const match = getSearchTitleMatch(anime('Quanzhi Gaoshou', { en: "The King's Avatar" }), 'quanzhi')

    expect(match).toEqual({
      matchedTitle: 'Quanzhi Gaoshou',
      sortTitle: 'Quanzhi Gaoshou',
    })
  })

  it('matches synonyms used by the upstream search result', () => {
    const match = getSearchTitleMatch(
      anime("Kuroko's Basketball 3", { synonyms: ['Basketball Which Kuroko Plays'] }),
      'which kuroko',
    )

    expect(match).toEqual({
      matchedTitle: 'Basketball Which Kuroko Plays',
      sortTitle: 'Basketball Which Kuroko Plays',
    })
  })

  it('handles punctuation differences for search badges', () => {
    expect(isSearchTitleMatch('.hack//Sign', 'hack sign')).toBe(true)
  })

  it('does not report a match when no known title contains the query', () => {
    expect(getSearchTitleMatch(anime('Cowboy Bebop'), 'quint')).toBeNull()
  })

  it('does not keep unrelated fuzzy MAL results for a search query', () => {
    expect(getSearchTitleMatch(anime('Shinryaku! Ika Musume', { en: 'The Squid Girl' }), 'quin')).toBeNull()
    expect(
      getSearchTitleMatch(
        anime('Detective Conan Movie 15: Quarter of Silence', { ja: '名探偵コナン 沈黙の15分' }),
        'quin',
      ),
    ).toBeNull()
  })
})
