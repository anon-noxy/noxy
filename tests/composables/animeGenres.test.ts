import { describe, expect, it } from 'vitest'

import { isSupportedAnimeGenre } from '../../shared/animeGenres'

describe('isSupportedAnimeGenre', () => {
  it('accepts genres shown in the site genre list', () => {
    expect(isSupportedAnimeGenre('Action')).toBe(true)
    expect(isSupportedAnimeGenre('Love Polygon')).toBe(true)
    expect(isSupportedAnimeGenre('Video Game')).toBe(true)
  })

  it('matches genre names case-insensitively and ignores surrounding whitespace', () => {
    expect(isSupportedAnimeGenre(' sci-fi ')).toBe(true)
  })

  it('excludes genres outside the supported list', () => {
    expect(isSupportedAnimeGenre('Kids')).toBe(false)
    expect(isSupportedAnimeGenre('Pets')).toBe(false)
    expect(isSupportedAnimeGenre()).toBe(false)
  })
})
