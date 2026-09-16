import { describe, expect, it } from 'vitest'
import {
  compareAzAnime,
  getAzSearchQueries,
  getAzTitleMatch,
  isAzMatch,
  toSortableAzTitle,
  type AzMatchSource,
} from '../../server/utils/az'
import type { MalAnime } from '../../server/utils/mal'

const anime = (
  title: string,
  alternatives: {
    en?: string
    ja?: string
    synonyms?: string[]
  } = {},
  id = Math.floor(Math.random() * 100000),
): MalAnime => ({
  id,
  title,
  alternative_titles: alternatives,
})

describe('A-Z anime matching', () => {
  it('sorts visible English titles under their significant word', () => {
    const match = getAzTitleMatch(anime('Gotoubun no Hanayome', { en: 'The Quintessential Quintuplets' }), 'q')

    expect(match).toMatchObject({
      matchedTitle: 'The Quintessential Quintuplets',
      sortTitle: 'Quintessential Quintuplets',
      source: 'english' satisfies AzMatchSource,
    })
  })

  it('falls back to romaji when the English title belongs under a different letter', () => {
    const match = getAzTitleMatch(anime('Quanzhi Gaoshou', { en: "The King's Avatar" }), 'q')

    expect(match).toMatchObject({
      matchedTitle: 'Quanzhi Gaoshou',
      sortTitle: 'Quanzhi Gaoshou',
      source: 'romaji' satisfies AzMatchSource,
    })
  })

  it('does not match a leading article as the alphabetized letter', () => {
    expect(isAzMatch(anime('Gotoubun no Hanayome', { en: 'The Quintessential Quintuplets' }), 't')).toBe(false)
  })

  it('generates Q search seeds that can find quintuplets-style titles', () => {
    expect(getAzSearchQueries('q')).toEqual(expect.arrayContaining(['qu', 'quin', 'quint']))
  })

  it('normalizes symbols and articles before grouping titles', () => {
    expect(toSortableAzTitle('"The Qwaser of Stigmata"')).toBe('Qwaser of Stigmata')
  })

  it('orders matched titles alphabetically with visible-title tie breaks', () => {
    const items = [
      anime("Kuroko's Basketball 3", { synonyms: ['Basketball Which Kuroko Plays'] }, 3),
      anime('Fights Break Sphere 4', { synonyms: ['Battle Through the Heavens 4'] }, 4),
      anime("Kuroko's Basketball 2", { synonyms: ['Basketball Which Kuroko Plays'] }, 2),
    ].sort(compareAzAnime('b'))

    expect(items.map((item) => item.title)).toEqual([
      "Kuroko's Basketball 2",
      "Kuroko's Basketball 3",
      'Fights Break Sphere 4',
    ])
  })

  it('matches number pages from the visible title instead of hidden romaji titles', () => {
    expect(isAzMatch(anime('3-gatsu no Lion', { en: 'March Comes In Like a Lion' }), 'number')).toBe(false)
    expect(isAzMatch(anime('86', { en: '86 Eighty-Six' }), 'number')).toBe(true)
  })

  it('matches symbol pages from the visible first character', () => {
    expect(isAzMatch(anime('Dot Hack Sign', { en: '.hack//Sign' }), 'symbol')).toBe(true)
    expect(isAzMatch(anime('Mojakou', { en: '[RAW] Mojakou' }), 'symbol')).toBe(true)
    expect(
      isAzMatch(anime('Himesama "Goumon" no Jikan desu', { en: '\'Tis Time for "Torture," Princess' }), 'symbol'),
    ).toBe(true)
  })

  it('does not put normal visible titles in symbol just because native titles are non-latin', () => {
    expect(isAzMatch(anime('Cowboy Bebop', { ja: 'カウボーイビバップ' }), 'symbol')).toBe(false)
  })
})
