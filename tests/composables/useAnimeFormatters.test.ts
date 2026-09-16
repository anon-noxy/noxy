import { describe, expect, it } from 'vitest'

import { useAnimeFormatters } from '../../app/composables/useAnimeFormatters'

describe('useAnimeFormatters', () => {
  const {
    cleanAnimeDescription,
    cleanAnimeInlineDescription,
    formatAnimeDate,
    formatAnimeDisplayDate,
    formatAnimeNumber,
    formatAnimeText,
  } = useAnimeFormatters()

  it('formats anime enum-style text', () => {
    expect(formatAnimeText('TV_SHORT')).toBe('Tv Short')
    expect(formatAnimeText()).toBe('N/A')
  })

  it('formats fuzzy dates', () => {
    expect(formatAnimeDate({ year: 2026, month: 5, day: 12 })).toBe('2026-05-12')
    expect(formatAnimeDate({ year: 2026 })).toBe('2026-??-??')
    expect(formatAnimeDisplayDate({ year: 2026, month: 5, day: 12 })).toBe('May 12, 2026')
  })

  it('formats compact values and cleans descriptions', () => {
    expect(formatAnimeNumber(1200)).toBe('1,200')
    expect(cleanAnimeDescription('<p>Hello<br>world</p>')).toBe('Hello\nworld')
    expect(cleanAnimeInlineDescription('<p>Hello<br>world</p>')).toBe('Hello world')
  })
})
