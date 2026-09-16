import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUserPreferencesStore } from '../../app/stores/userPreferences'

describe('useUserPreferencesStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    localStorage.clear()
    vi.setSystemTime(new Date('2026-05-17T12:00:00Z'))
  })

  it('hydrates valid persisted preferences and normalizes unsafe values', () => {
    localStorage.setItem('noxy-title-language', 'RO')
    localStorage.setItem('noxy-watch-language', 'dub')
    localStorage.setItem(
      'noxy-watchlist',
      JSON.stringify([
        { id: 1, title: 'Saved Anime', image: '/saved.jpg', status: 'completed', addedAt: 100, updatedAt: 200 },
        { id: 2, image: '/missing-title.jpg', status: 'watching' },
        { id: 3, title: 'Fallback Status', status: 'unknown' },
      ]),
    )
    localStorage.setItem(
      'noxy-continue-watching',
      JSON.stringify([
        {
          id: 10,
          title: 'Continue Anime',
          image: '/continue.jpg',
          episode: 3,
          language: 'dub',
          currentTime: '45',
          duration: '-20',
          progress: 125,
        },
        { id: 11, title: 'Missing episode' },
      ]),
    )
    localStorage.setItem(
      'noxy-watched-episodes',
      JSON.stringify([
        { id: 10, title: 'Continue Anime', image: '/continue.jpg', episode: 3, language: 'dub', watchedAt: 300 },
        { id: 12, title: 'Missing episode number' },
      ]),
    )
    localStorage.setItem(
      'noxy-episode-reactions',
      JSON.stringify([
        {
          id: 10,
          title: 'Continue Anime',
          image: '/continue.jpg',
          episode: 3,
          language: 'dub',
          reaction: 'shocked',
          updatedAt: 400,
        },
        { id: 12, title: 'Invalid reaction', episode: 1, language: 'sub', reaction: 'sleepy' },
        null,
      ]),
    )
    localStorage.setItem('noxy-recent-searches', JSON.stringify([' frieren ', '', 'dandadan']))
    localStorage.setItem('noxy-recent-viewed', JSON.stringify([{ id: 20, title: 'Viewed Anime' }]))

    const store = useUserPreferencesStore()

    store.hydrate()

    expect(store.selectedLanguage).toBe('RO')
    expect(store.defaultWatchLanguage).toBe('dub')
    expect(store.watchlist).toHaveLength(2)
    expect(store.watchlist[0]).toMatchObject({ id: 1, title: 'Saved Anime', status: 'completed' })
    expect(store.watchlist[1]).toMatchObject({ id: 3, title: 'Fallback Status', status: 'plan-to-watch' })
    expect(store.continueWatching).toHaveLength(1)
    expect(store.continueWatching[0]).toMatchObject({
      id: 10,
      episode: 3,
      language: 'dub',
      currentTime: 45,
      duration: 0,
      progress: 100,
    })
    expect(store.watchedEpisodes).toHaveLength(1)
    expect(store.watchedEpisodes[0]).toMatchObject({ id: 10, episode: 3, language: 'dub', watchedAt: 300 })
    expect(store.episodeReactions).toHaveLength(1)
    expect(store.episodeReactions[0]).toMatchObject({
      id: 10,
      episode: 3,
      language: 'dub',
      reaction: 'shocked',
      updatedAt: 400,
    })
    expect(store.recentSearches).toEqual(['frieren', 'dandadan'])
    expect(localStorage.getItem('noxy-recent-viewed')).toBeNull()
  })

  it('recovers from malformed persisted collections', () => {
    localStorage.setItem('noxy-watchlist', '{')
    localStorage.setItem('noxy-continue-watching', '{')
    localStorage.setItem('noxy-watched-episodes', '{')
    localStorage.setItem('noxy-episode-reactions', '{')
    localStorage.setItem('noxy-recent-searches', '{')
    localStorage.setItem('noxy-recent-viewed', '{')

    const store = useUserPreferencesStore()

    store.hydrate()

    expect(store.watchlist).toEqual([])
    expect(store.continueWatching).toEqual([])
    expect(store.watchedEpisodes).toEqual([])
    expect(store.episodeReactions).toEqual([])
    expect(store.recentSearches).toEqual([])
    expect(localStorage.getItem('noxy-recent-viewed')).toBeNull()
  })

  it('persists language and toggles watchlist entries', () => {
    const store = useUserPreferencesStore()

    store.setLanguage('RO')
    expect(store.selectedLanguage).toBe('RO')
    expect(localStorage.getItem('noxy-title-language')).toBe('RO')

    store.toggleLanguage()
    expect(store.selectedLanguage).toBe('EN')

    store.setDefaultWatchLanguage('dub')
    expect(store.defaultWatchLanguage).toBe('dub')
    expect(localStorage.getItem('noxy-watch-language')).toBe('dub')

    store.toggleWatchlist({ id: 21, title: 'Watch Me', image: '/watch.jpg', status: 'watching', episodes: 12 })
    expect(store.isInWatchlist(21)).toBe(true)
    expect(store.watchlistCount).toBe(1)
    expect(store.watchlist[0]?.episodes).toBe(12)
    expect(JSON.parse(localStorage.getItem('noxy-watchlist') || '[]')).toHaveLength(1)

    store.updateWatchlistStatus(21, 'completed')
    expect(store.watchlist[0]?.status).toBe('completed')

    store.updateWatchlistNote(21, '  rewatch finale  ')
    expect(store.watchlist[0]?.note).toBe('rewatch finale')

    store.toggleWatchlist({ id: 21, title: 'Watch Me', image: '/watch.jpg' })
    expect(store.isInWatchlist(21)).toBe(false)
  })

  it('limits watchlist and recent searches to their maximum sizes', () => {
    const store = useUserPreferencesStore()

    for (let index = 1; index <= 55; index += 1) {
      store.toggleWatchlist({ id: index, title: `Anime ${index}`, image: '' })
    }

    expect(store.watchlist).toHaveLength(50)
    expect(store.watchlist[0]?.id).toBe(55)
    expect(store.watchlist.at(-1)?.id).toBe(6)

    for (let index = 1; index <= 10; index += 1) {
      store.addRecentSearch(`Query ${index}`)
    }

    store.addRecentSearch('query 8')
    store.addRecentSearch('x')

    expect(store.recentSearches).toHaveLength(8)
    expect(store.recentSearches[0]).toBe('query 8')
    expect(store.recentSearches.filter((query) => query.toLowerCase() === 'query 8')).toHaveLength(1)
  })

  it('manages continue watching entries and progress updates', () => {
    const store = useUserPreferencesStore()

    store.setContinueWatching({
      id: 31,
      title: 'Episode Anime',
      image: '/episode.jpg',
      episode: 1,
      language: 'sub',
      currentTime: 10,
      duration: 100,
      progress: 10,
    })
    store.setContinueWatching({
      id: 31,
      title: 'Episode Anime',
      image: '/episode.jpg',
      episode: 2,
      language: 'dub',
    })
    store.setContinueWatching({
      id: 32,
      title: 'Other Anime',
      image: '/other.jpg',
      episode: 1,
      language: 'sub',
    })

    expect(store.continueWatching.map((entry) => `${entry.id}:${entry.episode}:${entry.language}`)).toEqual([
      '32:1:sub',
      '31:2:dub',
      '31:1:sub',
    ])
    expect(store.getContinueWatching(31)?.episode).toBe(2)

    store.updateContinueWatchingProgress(31, 2, 'dub', 30, 60)
    expect(store.getContinueWatching(31)).toMatchObject({
      currentTime: 30,
      duration: 60,
      progress: 50,
    })
    expect(
      store.continueWatching.find((entry) => entry.id === 31 && entry.episode === 1 && entry.language === 'sub'),
    ).toMatchObject({
      currentTime: 10,
      duration: 100,
      progress: 10,
    })

    store.updateContinueWatchingProgress(31, 2, 'sub', 60, 60)
    expect(store.getContinueWatching(31)?.progress).toBe(50)

    store.clearContinueWatching(31)
    expect(store.continueWatching.map((entry) => entry.id)).toEqual([32])

    store.clearContinueWatching()
    expect(store.continueWatching).toEqual([])
  })

  it('manages watched episodes', () => {
    const store = useUserPreferencesStore()

    expect(
      store.toggleEpisodeWatched({
        id: 41,
        title: 'Watched Anime',
        image: '/watched.jpg',
        episode: 7,
        language: 'sub',
      }),
    ).toBe(true)
    expect(store.isEpisodeWatched(41, 7, 'sub')).toBe(true)
    expect(JSON.parse(localStorage.getItem('noxy-watched-episodes') || '[]')).toHaveLength(1)

    expect(
      store.toggleEpisodeWatched({
        id: 41,
        title: 'Watched Anime',
        image: '/watched.jpg',
        episode: 7,
        language: 'sub',
      }),
    ).toBe(false)
    expect(store.isEpisodeWatched(41, 7, 'sub')).toBe(false)

    store.markEpisodeWatched({
      id: 41,
      title: 'Watched Anime',
      image: '/watched.jpg',
      episode: 8,
      language: 'dub',
    })
    store.markEpisodesWatched(
      {
        id: 41,
        title: 'Watched Anime',
        image: '/watched.jpg',
        language: 'sub',
      },
      [1, 2, 3],
    )
    expect(store.getWatchlistProgress(41, 10)).toMatchObject({ watched: 4, total: 10, percent: 40, nextEpisode: 4 })

    store.setEpisodesWatched(
      {
        id: 41,
        title: 'Watched Anime',
        image: '/watched.jpg',
        language: 'sub',
      },
      [1, 2, 2, 0, -1],
    )
    expect(
      store.watchedEpisodes
        .filter((entry) => entry.id === 41 && entry.language === 'sub')
        .map((entry) => entry.episode),
    ).toEqual([1, 2])
    expect(store.isEpisodeWatched(41, 8, 'dub')).toBe(true)
    expect(store.getWatchlistProgress(41, 10)).toMatchObject({ watched: 3, total: 10, percent: 30, nextEpisode: 3 })

    store.clearWatchedEpisodes(41, 'sub')
    expect(store.watchedEpisodes).toHaveLength(1)
    expect(store.isEpisodeWatched(41, 8, 'dub')).toBe(true)

    store.clearWatchedEpisodes(41)
    expect(store.watchedEpisodes).toEqual([])
  })

  it('keeps every episode when marking a long-running anime complete', () => {
    const store = useUserPreferencesStore()
    const episodes = Array.from({ length: 1170 }, (_, index) => index + 1)

    store.markEpisodesWatched(
      {
        id: 61,
        title: 'Long Anime',
        image: '/long.jpg',
        language: 'sub',
      },
      episodes,
    )

    expect(store.watchedEpisodes.filter((entry) => entry.id === 61)).toHaveLength(1170)
    expect(store.isEpisodeWatched(61, 424, 'sub')).toBe(true)
    expect(store.isEpisodeWatched(61, 610, 'sub')).toBe(true)
    expect(store.isEpisodeWatched(61, 1170, 'sub')).toBe(true)
    expect(store.getWatchlistProgress(61, 1170)).toMatchObject({
      watched: 1170,
      total: 1170,
      percent: 100,
      nextEpisode: 0,
    })
  })

  it('manages one personal reaction per episode and language', () => {
    const store = useUserPreferencesStore()

    store.updateEpisodeReaction({
      id: 45,
      title: 'Reaction Anime',
      image: '/reaction.jpg',
      episode: 4,
      language: 'sub',
      reaction: 'happy',
    })
    store.updateEpisodeReaction({
      id: 45,
      title: 'Reaction Anime',
      image: '/reaction.jpg',
      episode: 4,
      language: 'dub',
      reaction: 'sad',
    })
    store.updateEpisodeReaction({
      id: 45,
      title: 'Reaction Anime',
      image: '/reaction.jpg',
      episode: 4,
      language: 'sub',
      reaction: 'angry',
    })

    expect(store.episodeReactions).toHaveLength(2)
    expect(store.getEpisodeReaction(45, 4, 'sub')?.reaction).toBe('angry')
    expect(store.getEpisodeReaction(45, 4, 'dub')?.reaction).toBe('sad')
    expect(JSON.parse(localStorage.getItem('noxy-episode-reactions') || '[]')).toHaveLength(2)

    store.updateEpisodeReaction({
      id: 45,
      title: 'Reaction Anime',
      image: '/reaction.jpg',
      episode: 4,
      language: 'sub',
      reaction: null,
    })

    expect(store.getEpisodeReaction(45, 4, 'sub')).toBeUndefined()
    expect(store.getEpisodeReaction(45, 4, 'dub')?.reaction).toBe('sad')
  })

  it('exports and imports user data backups', () => {
    const sourceStore = useUserPreferencesStore()

    sourceStore.setLanguage('RO')
    sourceStore.setDefaultWatchLanguage('dub')
    sourceStore.toggleWatchlist({ id: 51, title: 'Backup Anime', image: '/backup.jpg', status: 'watching' })
    sourceStore.updateWatchlistNote(51, 'Save this note')
    sourceStore.setContinueWatching({
      id: 51,
      title: 'Backup Anime',
      image: '/backup.jpg',
      episode: 2,
      language: 'sub',
    })
    sourceStore.markEpisodeWatched({
      id: 51,
      title: 'Backup Anime',
      image: '/backup.jpg',
      episode: 1,
      language: 'sub',
    })
    sourceStore.updateEpisodeReaction({
      id: 51,
      title: 'Backup Anime',
      image: '/backup.jpg',
      episode: 1,
      language: 'sub',
      reaction: 'shocked',
    })
    sourceStore.addRecentSearch('backup')

    const backup = sourceStore.exportUserData()
    expect(JSON.parse(backup)).not.toHaveProperty('recentViewed')

    setActivePinia(createPinia())
    localStorage.clear()

    const importedStore = useUserPreferencesStore()
    importedStore.importUserData(backup)

    expect(importedStore.selectedLanguage).toBe('RO')
    expect(importedStore.defaultWatchLanguage).toBe('dub')
    expect(importedStore.watchlist[0]).toMatchObject({
      id: 51,
      title: 'Backup Anime',
      status: 'watching',
      note: 'Save this note',
    })
    expect(importedStore.continueWatching[0]).toMatchObject({ id: 51, episode: 2 })
    expect(importedStore.watchedEpisodes[0]).toMatchObject({ id: 51, episode: 1 })
    expect(importedStore.episodeReactions[0]).toMatchObject({
      id: 51,
      episode: 1,
      reaction: 'shocked',
    })
    expect(importedStore.recentSearches).toEqual(['backup'])
  })

  it('manages recent searches and toast lifecycle', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123)
    const store = useUserPreferencesStore()

    store.addRecentSearch('Frieren')
    store.addRecentSearch('Dandadan')
    store.removeRecentSearch('frieren')
    expect(store.recentSearches).toEqual(['Dandadan'])

    store.clearRecentSearches()
    expect(store.recentSearches).toEqual([])

    store.pushToast('Saved', 'success')
    expect(store.toasts[0]).toMatchObject({ message: 'Saved', tone: 'success' })

    store.removeToast(store.toasts[0]?.id || 0)
    expect(store.toasts).toEqual([])

    store.pushToast('Auto remove')
    expect(store.toasts).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(2600)
    expect(store.toasts).toEqual([])
  })
})
