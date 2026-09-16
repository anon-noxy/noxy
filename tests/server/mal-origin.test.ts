import { describe, expect, it } from 'vitest'
import { getJapaneseOriginPriority, hasChineseOriginCue, type MalAnime } from '../../server/utils/mal'

const anime = (
  title: string,
  alternatives: {
    en?: string
    ja?: string
    synonyms?: string[]
  } = {},
  studios: Array<{ id: number; name: string }> = [],
): MalAnime => ({
  id: Math.floor(Math.random() * 100000),
  title,
  alternative_titles: alternatives,
  studios,
})

describe('MAL origin heuristics', () => {
  it('detects Chinese-origin title cues', () => {
    expect(hasChineseOriginCue(anime('Quanzhi Gaoshou', { en: "The King's Avatar" }))).toBe(true)
    expect(hasChineseOriginCue(anime('Douluo Dalu', { en: 'Soul Land' }))).toBe(true)
  })

  it('detects Chinese-origin studio cues', () => {
    expect(hasChineseOriginCue(anime('Some Airing Anime', {}, [{ id: 1, name: 'bilibili' }]))).toBe(true)
    expect(hasChineseOriginCue(anime('Some Airing Anime', {}, [{ id: 2, name: 'Sparkly Key Animation Studio' }]))).toBe(
      true,
    )
  })

  it('prioritizes likely Japanese entries above unknown entries', () => {
    const japanese = anime('Sousou no Frieren', { ja: '葬送のフリーレン' }, [{ id: 1, name: 'Madhouse' }])
    const unknown = anime('Unknown Airing Title')

    expect(getJapaneseOriginPriority(japanese)).toBeGreaterThan(getJapaneseOriginPriority(unknown))
  })

  it('gives Chinese-origin entries a hidden priority', () => {
    expect(getJapaneseOriginPriority(anime('Wanmei Shijie', { en: 'Perfect World' }))).toBe(-1)
  })
})
