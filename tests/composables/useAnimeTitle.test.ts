import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useAnimeTitle } from '../../app/composables/useAnimeTitle'

describe('useAnimeTitle', () => {
  const title = {
    english: 'English Title',
    romaji: 'Romaji Title',
    native: 'Native Title',
    userPreferred: 'Preferred Title',
  }

  it('prefers English titles when English mode is selected', () => {
    const selectedLanguage = ref('EN')
    const { getAlternateAnimeTitle, getAnimeTitle } = useAnimeTitle(selectedLanguage)

    expect(getAnimeTitle(title)).toBe('English Title')
    expect(getAlternateAnimeTitle(title)).toBe('Romaji Title')
  })

  it('prefers romaji titles when romaji mode is selected', () => {
    const selectedLanguage = ref('RO')
    const { getAlternateAnimeTitle, getAnimeTitle } = useAnimeTitle(selectedLanguage)

    expect(getAnimeTitle(title)).toBe('Romaji Title')
    expect(getAlternateAnimeTitle(title)).toBe('English Title')
  })

  it('falls back through available title fields', () => {
    const selectedLanguage = ref('EN')
    const { getAlternateAnimeTitle, getAnimeTitle } = useAnimeTitle(selectedLanguage)

    expect(getAnimeTitle({ native: 'Native Only' })).toBe('Native Only')
    expect(getAnimeTitle(undefined, 'Fallback Anime')).toBe('Fallback Anime')
    expect(getAlternateAnimeTitle({})).toBe('')
  })
})
