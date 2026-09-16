import { useState } from '#app'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAnimeWatchlist } from '../../app/composables/useAnimeWatchlist'

const authenticate = () => {
  const user = {
    id: 'user-1',
    email: 'fan@example.com',
    user_metadata: {
      username: 'fan',
    },
  }

  useState<unknown | null>('noxy-auth-user', () => null).value = user
  useState<unknown | null>('noxy-auth-session', () => null).value = { user }
  useState('noxy-auth-ready', () => false).value = true
}

describe('useAnimeWatchlist', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    useState<unknown | null>('noxy-auth-user', () => null).value = null
    useState<unknown | null>('noxy-auth-session', () => null).value = null
    useState<unknown | null>('noxy-auth-profile', () => null).value = null
    useState('noxy-auth-ready', () => false).value = true
  })

  it('reports unsaved anime and ignores empty toggles', () => {
    const watchlist = useAnimeWatchlist()

    expect(watchlist.isAnimeSaved()).toBe(false)
    expect(watchlist.isAnimeSaved(100)).toBe(false)

    watchlist.toggleAnimeSaved(null)
    expect(watchlist.userPreferences.watchlist).toEqual([])
  })

  it('adds and removes anime with toast feedback', () => {
    authenticate()
    const watchlist = useAnimeWatchlist()

    watchlist.toggleAnimeSaved({ id: 100, title: 'Frieren', image: '/frieren.jpg' })

    expect(watchlist.isAnimeSaved(100)).toBe(true)
    expect(watchlist.userPreferences.toasts[0]).toMatchObject({
      message: 'Frieren added to watchlist',
      tone: 'success',
    })

    watchlist.toggleAnimeSaved({ id: 100, title: 'Frieren', image: '/frieren.jpg' })

    expect(watchlist.isAnimeSaved(100)).toBe(false)
    expect(watchlist.userPreferences.toasts[0]).toMatchObject({
      message: 'Frieren removed from watchlist',
      tone: 'info',
    })
  })
})
