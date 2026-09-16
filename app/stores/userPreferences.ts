import { defineStore } from 'pinia'

export type WatchlistStatus = 'watching' | 'plan-to-watch' | 'completed' | 'on-hold'

export type WatchlistAnime = {
  id: number
  title: string
  image: string
  episodes?: number
  note?: string
  status: WatchlistStatus
  addedAt: number
  updatedAt: number
}

export type WatchlistAnimeInput = Pick<WatchlistAnime, 'id' | 'title' | 'image'> & Partial<WatchlistAnime>

type WatchlistSyncActions = {
  upsert: (anime: WatchlistAnime) => Promise<void>
  remove: (animeId: number) => Promise<void>
  clear: () => Promise<void>
  replaceAll: (entries: WatchlistAnime[]) => Promise<void>
}

export type ContinueWatchingEntry = {
  id: number
  title: string
  englishTitle?: string
  romajiTitle?: string
  image: string
  episode: number
  language: 'sub' | 'dub'
  currentTime?: number
  duration?: number
  progress?: number
  updatedAt: number
}

export type WatchedEpisodeEntry = {
  id: number
  title: string
  image: string
  episode: number
  language: 'sub' | 'dub'
  watchedAt: number
}

export type EpisodeNoteEntry = {
  id: number
  title: string
  image: string
  episode: number
  language: 'sub' | 'dub'
  note: string
  updatedAt: number
}

export type WatchLanguage = 'sub' | 'dub'

export const EPISODE_REACTIONS = ['happy', 'sad', 'angry', 'shocked'] as const

export type EpisodeReaction = (typeof EPISODE_REACTIONS)[number]

export type EpisodeReactionEntry = {
  id: number
  title: string
  image: string
  episode: number
  language: WatchLanguage
  reaction: EpisodeReaction
  updatedAt: number
}

export type EpisodeReactionInput = Omit<EpisodeReactionEntry, 'reaction' | 'updatedAt'> & {
  reaction: EpisodeReaction | null
}

export type ToastTone = 'success' | 'info' | 'error'

export type AppToast = {
  id: number
  message: string
  tone: ToastTone
}

const WATCHLIST_STORAGE_KEY = 'noxy-watchlist'
const CONTINUE_WATCHING_STORAGE_KEY = 'noxy-continue-watching'
const WATCHED_EPISODES_STORAGE_KEY = 'noxy-watched-episodes'
const EPISODE_NOTES_STORAGE_KEY = 'noxy-episode-notes'
const LANGUAGE_STORAGE_KEY = 'noxy-title-language'
const WATCH_LANGUAGE_STORAGE_KEY = 'noxy-watch-language'
const MARK_WATCHED_ADVANCE_STORAGE_KEY = 'noxy-mark-watched-advance'
const RECENT_SEARCHES_STORAGE_KEY = 'noxy-recent-searches'
const EPISODE_REACTIONS_STORAGE_KEY = 'noxy-episode-reactions'
const BACKUP_VERSION = 1
export const WATCHLIST_STATUSES: Array<{ value: WatchlistStatus; label: string }> = [
  { value: 'watching', label: 'Watching' },
  { value: 'plan-to-watch', label: 'Plan to Watch' },
  { value: 'completed', label: 'Completed' },
  { value: 'on-hold', label: 'On Hold' },
]
const continueWatchingLimit = 50
const recentSearchesLimit = 8
const watchedEpisodesLimit = 10000
const episodeNotesLimit = 1000
const episodeReactionsLimit = 1000

const toSafeNumber = (value: unknown) => {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

const toSafeProgress = (value: unknown) => {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return 0
  }

  return Math.min(Math.round(numberValue), 100)
}

const toWatchlistStatus = (value: unknown): WatchlistStatus => {
  return WATCHLIST_STATUSES.some((status) => status.value === value) ? (value as WatchlistStatus) : 'plan-to-watch'
}

const toWatchLanguage = (value: unknown): WatchLanguage => {
  return value === 'dub' ? 'dub' : 'sub'
}

const toEpisodeReaction = (value: unknown): EpisodeReaction | null => {
  return EPISODE_REACTIONS.includes(value as EpisodeReaction) ? (value as EpisodeReaction) : null
}

const toSafeTitle = (value: unknown) => {
  return String(value || '').trim()
}

const normalizeWatchlistAnime = (anime: Partial<WatchlistAnime>): WatchlistAnime | null => {
  if (!anime?.id || !anime?.title) return null

  const now = Date.now()

  return {
    id: anime.id,
    title: toSafeTitle(anime.title),
    image: anime.image || '',
    episodes: toSafeNumber(anime.episodes) || undefined,
    note: String(anime.note || '').slice(0, 500),
    status: toWatchlistStatus(anime.status),
    addedAt: Number(anime.addedAt) || now,
    updatedAt: Number(anime.updatedAt) || Number(anime.addedAt) || now,
  }
}

const normalizeContinueWatchingEntry = (anime: Partial<ContinueWatchingEntry>): ContinueWatchingEntry | null => {
  if (!anime?.id || !anime?.title || !anime?.episode) return null

  return {
    id: anime.id,
    title: toSafeTitle(anime.title),
    englishTitle: toSafeTitle(anime.englishTitle) || undefined,
    romajiTitle: toSafeTitle(anime.romajiTitle) || undefined,
    image: anime.image || '',
    episode: Math.trunc(toSafeNumber(anime.episode)),
    language: toWatchLanguage(anime.language),
    currentTime: toSafeNumber(anime.currentTime),
    duration: toSafeNumber(anime.duration),
    progress: toSafeProgress(anime.progress),
    updatedAt: Number(anime.updatedAt) || Date.now(),
  }
}

const normalizeWatchedEpisode = (entry: Partial<WatchedEpisodeEntry>): WatchedEpisodeEntry | null => {
  if (!entry?.id || !entry?.title || !entry?.episode) return null

  return {
    id: entry.id,
    title: entry.title,
    image: entry.image || '',
    episode: Math.trunc(toSafeNumber(entry.episode)),
    language: toWatchLanguage(entry.language),
    watchedAt: Number(entry.watchedAt) || Date.now(),
  }
}

const normalizeEpisodeNote = (entry: Partial<EpisodeNoteEntry>): EpisodeNoteEntry | null => {
  if (!entry?.id || !entry?.title || !entry?.episode || !entry?.note) return null

  const note = String(entry.note || '')
    .trim()
    .slice(0, 500)

  if (!note) return null

  return {
    id: entry.id,
    title: entry.title,
    image: entry.image || '',
    episode: Math.trunc(toSafeNumber(entry.episode)),
    language: toWatchLanguage(entry.language),
    note,
    updatedAt: Number(entry.updatedAt) || Date.now(),
  }
}

const normalizeEpisodeReaction = (entry: Partial<EpisodeReactionEntry>): EpisodeReactionEntry | null => {
  const reaction = toEpisodeReaction(entry?.reaction)

  if (!entry?.id || !entry?.title || !entry?.episode || !reaction) return null

  return {
    id: entry.id,
    title: toSafeTitle(entry.title),
    image: entry.image || '',
    episode: Math.trunc(toSafeNumber(entry.episode)),
    language: toWatchLanguage(entry.language),
    reaction,
    updatedAt: Number(entry.updatedAt) || Date.now(),
  }
}

export const useUserPreferencesStore = defineStore('userPreferences', () => {
  const selectedLanguage = ref('EN')
  const defaultWatchLanguage = ref<WatchLanguage>('sub')
  const shouldAdvanceAfterMarkWatched = ref(false)
  const watchlist = ref<WatchlistAnime[]>([])
  const continueWatching = ref<ContinueWatchingEntry[]>([])
  const watchedEpisodes = ref<WatchedEpisodeEntry[]>([])
  const episodeNotes = ref<EpisodeNoteEntry[]>([])
  const episodeReactions = ref<EpisodeReactionEntry[]>([])
  const recentSearches = ref<string[]>([])
  const toasts = ref<AppToast[]>([])
  let watchlistSyncActions: WatchlistSyncActions | null = null

  const watchlistCount = computed(() => watchlist.value.length)

  const runWatchlistSync = (operation?: Promise<void>) => {
    if (!operation) return

    void operation.catch((error) => {
      console.error('Watchlist sync error:', error)
      pushToast('Unable to sync watchlist right now', 'error')
    })
  }

  const hydrate = () => {
    if (!import.meta.client) return

    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)

    if (storedLanguage === 'EN' || storedLanguage === 'RO') {
      selectedLanguage.value = storedLanguage
    }

    defaultWatchLanguage.value = toWatchLanguage(localStorage.getItem(WATCH_LANGUAGE_STORAGE_KEY))
    shouldAdvanceAfterMarkWatched.value = localStorage.getItem(MARK_WATCHED_ADVANCE_STORAGE_KEY) === 'true'

    try {
      const storedWatchlist = JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY) || '[]') as WatchlistAnime[]

      if (Array.isArray(storedWatchlist)) {
        watchlist.value = storedWatchlist
          .map((anime) => normalizeWatchlistAnime(anime))
          .filter((anime): anime is WatchlistAnime => Boolean(anime))
      }
    } catch {
      watchlist.value = []
    }

    try {
      const storedContinueWatching = JSON.parse(
        localStorage.getItem(CONTINUE_WATCHING_STORAGE_KEY) || '[]',
      ) as ContinueWatchingEntry[]

      if (Array.isArray(storedContinueWatching)) {
        continueWatching.value = storedContinueWatching
          .map((anime) => normalizeContinueWatchingEntry(anime))
          .filter((anime): anime is ContinueWatchingEntry => Boolean(anime))
          .slice(0, continueWatchingLimit)
      }
    } catch {
      continueWatching.value = []
    }

    try {
      const storedWatchedEpisodes = JSON.parse(
        localStorage.getItem(WATCHED_EPISODES_STORAGE_KEY) || '[]',
      ) as WatchedEpisodeEntry[]

      if (Array.isArray(storedWatchedEpisodes)) {
        watchedEpisodes.value = storedWatchedEpisodes
          .map((entry) => normalizeWatchedEpisode(entry))
          .filter((entry): entry is WatchedEpisodeEntry => Boolean(entry))
          .slice(0, watchedEpisodesLimit)
      }
    } catch {
      watchedEpisodes.value = []
    }

    try {
      const storedEpisodeNotes = JSON.parse(
        localStorage.getItem(EPISODE_NOTES_STORAGE_KEY) || '[]',
      ) as EpisodeNoteEntry[]

      if (Array.isArray(storedEpisodeNotes)) {
        episodeNotes.value = storedEpisodeNotes
          .map((entry) => normalizeEpisodeNote(entry))
          .filter((entry): entry is EpisodeNoteEntry => Boolean(entry))
          .slice(0, episodeNotesLimit)
      }
    } catch {
      episodeNotes.value = []
    }

    try {
      const storedEpisodeReactions = JSON.parse(
        localStorage.getItem(EPISODE_REACTIONS_STORAGE_KEY) || '[]',
      ) as EpisodeReactionEntry[]

      if (Array.isArray(storedEpisodeReactions)) {
        episodeReactions.value = storedEpisodeReactions
          .map((entry) => normalizeEpisodeReaction(entry))
          .filter((entry): entry is EpisodeReactionEntry => Boolean(entry))
          .slice(0, episodeReactionsLimit)
      }
    } catch {
      episodeReactions.value = []
    }

    try {
      const storedRecentSearches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) || '[]') as string[]

      if (Array.isArray(storedRecentSearches)) {
        recentSearches.value = storedRecentSearches
          .map((query) => String(query || '').trim())
          .filter(Boolean)
          .slice(0, recentSearchesLimit)
      }
    } catch {
      recentSearches.value = []
    }

    localStorage.removeItem('noxy-recent-viewed')
  }

  const persistWatchlist = () => {
    if (!import.meta.client) return

    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist.value))
  }

  const persistContinueWatching = () => {
    if (!import.meta.client) return

    localStorage.setItem(CONTINUE_WATCHING_STORAGE_KEY, JSON.stringify(continueWatching.value))
  }

  const persistWatchedEpisodes = () => {
    if (!import.meta.client) return

    localStorage.setItem(WATCHED_EPISODES_STORAGE_KEY, JSON.stringify(watchedEpisodes.value))
  }

  const persistEpisodeNotes = () => {
    if (!import.meta.client) return

    localStorage.setItem(EPISODE_NOTES_STORAGE_KEY, JSON.stringify(episodeNotes.value))
  }

  const persistEpisodeReactions = () => {
    if (!import.meta.client) return

    localStorage.setItem(EPISODE_REACTIONS_STORAGE_KEY, JSON.stringify(episodeReactions.value))
  }

  const persistRecentSearches = () => {
    if (!import.meta.client) return

    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentSearches.value))
  }

  const setLanguage = (language: string) => {
    selectedLanguage.value = language === 'RO' ? 'RO' : 'EN'

    if (import.meta.client) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage.value)
    }
  }

  const toggleLanguage = () => {
    setLanguage(selectedLanguage.value === 'EN' ? 'RO' : 'EN')
  }

  const setDefaultWatchLanguage = (language: WatchLanguage) => {
    defaultWatchLanguage.value = toWatchLanguage(language)

    if (import.meta.client) {
      localStorage.setItem(WATCH_LANGUAGE_STORAGE_KEY, defaultWatchLanguage.value)
    }
  }

  const setShouldAdvanceAfterMarkWatched = (value: boolean) => {
    shouldAdvanceAfterMarkWatched.value = value

    if (import.meta.client) {
      localStorage.setItem(MARK_WATCHED_ADVANCE_STORAGE_KEY, String(value))
    }
  }

  const isInWatchlist = (animeId: number) => {
    return watchlist.value.some((anime) => anime.id === animeId)
  }

  const setWatchlistSyncActions = (actions: WatchlistSyncActions | null) => {
    watchlistSyncActions = actions
  }

  const replaceWatchlist = (entries: WatchlistAnime[], options: { persist?: boolean; sync?: boolean } = {}) => {
    const { persist = true, sync = false } = options

    watchlist.value = entries
      .map((anime) => normalizeWatchlistAnime(anime))
      .filter((anime): anime is WatchlistAnime => Boolean(anime))
      .slice(0, 50)

    if (persist) {
      persistWatchlist()
    }

    if (sync) {
      runWatchlistSync(watchlistSyncActions?.replaceAll(watchlist.value))
    }
  }

  const toggleWatchlist = (anime: WatchlistAnimeInput) => {
    if (isInWatchlist(anime.id)) {
      watchlist.value = watchlist.value.filter((item) => item.id !== anime.id)
      runWatchlistSync(watchlistSyncActions?.remove(anime.id))
    } else {
      const normalizedAnime = normalizeWatchlistAnime(anime)

      if (!normalizedAnime) return

      watchlist.value = [normalizedAnime, ...watchlist.value].slice(0, 50)
      runWatchlistSync(watchlistSyncActions?.upsert(normalizedAnime))
    }

    persistWatchlist()
  }

  const updateWatchlistStatus = (animeId: number, status: WatchlistStatus) => {
    const safeStatus = toWatchlistStatus(status)

    let updatedAnime: WatchlistAnime | null = null

    watchlist.value = watchlist.value.map((anime) => {
      if (anime.id !== animeId) return anime

      updatedAnime = {
        ...anime,
        status: safeStatus,
        updatedAt: Date.now(),
      }

      return updatedAnime
    })

    persistWatchlist()
    runWatchlistSync(updatedAnime ? watchlistSyncActions?.upsert(updatedAnime) : undefined)
  }

  const updateWatchlistNote = (animeId: number, note: string) => {
    let updatedAnime: WatchlistAnime | null = null

    watchlist.value = watchlist.value.map((anime) => {
      if (anime.id !== animeId) return anime

      updatedAnime = {
        ...anime,
        note: note.trim().slice(0, 500),
        updatedAt: Date.now(),
      }

      return updatedAnime
    })

    persistWatchlist()
    runWatchlistSync(updatedAnime ? watchlistSyncActions?.upsert(updatedAnime) : undefined)
  }

  const syncWatchlistStatusFromProgress = (animeId: number) => {
    const anime = watchlist.value.find((item) => item.id === animeId)

    if (!anime) return

    const progress = getWatchlistProgress(animeId, anime.episodes)
    let nextStatus = anime.status

    if (progress.total && progress.watched >= progress.total) {
      nextStatus = 'completed'
    } else if (progress.watched > 0 && anime.status === 'plan-to-watch') {
      nextStatus = 'watching'
    }

    if (nextStatus === anime.status) return

    let updatedAnime: WatchlistAnime | null = null

    watchlist.value = watchlist.value.map((item) => {
      if (item.id !== animeId) return item

      updatedAnime = {
        ...item,
        status: nextStatus,
        updatedAt: Date.now(),
      }

      return updatedAnime
    })
    persistWatchlist()
    runWatchlistSync(updatedAnime ? watchlistSyncActions?.upsert(updatedAnime) : undefined)
  }

  const clearWatchlist = () => {
    watchlist.value = []
    persistWatchlist()
    runWatchlistSync(watchlistSyncActions?.clear())
  }

  const getWatchlistProgress = (animeId: number, totalEpisodes?: number) => {
    const watchedSet = new Set(
      watchedEpisodes.value.filter((entry) => entry.id === animeId).map((entry) => entry.episode),
    )
    const watchedCount = watchedSet.size
    const latestContinueEpisode = continueWatching.value.find((entry) => entry.id === animeId)?.episode || 0
    const total = Math.max(Math.trunc(toSafeNumber(totalEpisodes)), watchedCount, latestContinueEpisode)
    const nextEpisode = total
      ? Array.from({ length: total }, (_, index) => index + 1).find((episode) => !watchedSet.has(episode)) || 0
      : latestContinueEpisode || 1

    return {
      watched: watchedCount,
      total,
      percent: total ? Math.min(Math.round((watchedCount / total) * 100), 100) : 0,
      nextEpisode,
    }
  }

  const getContinueWatching = (animeId: number) => {
    return continueWatching.value.find((anime) => anime.id === animeId)
  }

  const setContinueWatching = (entry: Omit<ContinueWatchingEntry, 'updatedAt'>) => {
    if (!entry.id) return

    const language: ContinueWatchingEntry['language'] = toWatchLanguage(entry.language)
    const episode = Math.trunc(toSafeNumber(entry.episode))

    if (!episode) return

    const existingEntry = continueWatching.value.find(
      (anime) => anime.id === entry.id && anime.episode === episode && anime.language === language,
    )

    continueWatching.value = [
      {
        ...existingEntry,
        ...entry,
        episode,
        language,
        updatedAt: Date.now(),
      },
      ...continueWatching.value.filter(
        (anime) => anime.id !== entry.id || anime.episode !== episode || anime.language !== language,
      ),
    ].slice(0, continueWatchingLimit)

    persistContinueWatching()
  }

  const clearContinueWatching = (animeId?: number) => {
    continueWatching.value = animeId ? continueWatching.value.filter((anime) => anime.id !== animeId) : []
    persistContinueWatching()
  }

  const isEpisodeWatched = (
    animeId: number | undefined,
    episode: number,
    language: ContinueWatchingEntry['language'] = 'sub',
  ) => {
    if (!animeId || !episode) return false

    const safeLanguage: ContinueWatchingEntry['language'] = toWatchLanguage(language)

    return watchedEpisodes.value.some(
      (entry) => entry.id === animeId && entry.episode === episode && entry.language === safeLanguage,
    )
  }

  const markEpisodeWatched = (entry: Omit<WatchedEpisodeEntry, 'watchedAt'>) => {
    if (!entry.id || !entry.title || !entry.episode) return

    const safeLanguage: WatchedEpisodeEntry['language'] = toWatchLanguage(entry.language)

    watchedEpisodes.value = [
      {
        ...entry,
        image: entry.image || '',
        episode: Math.trunc(toSafeNumber(entry.episode)),
        language: safeLanguage,
        watchedAt: Date.now(),
      },
      ...watchedEpisodes.value.filter(
        (item) => item.id !== entry.id || item.episode !== entry.episode || item.language !== safeLanguage,
      ),
    ].slice(0, watchedEpisodesLimit)

    persistWatchedEpisodes()
    syncWatchlistStatusFromProgress(entry.id)
  }

  const unmarkEpisodeWatched = (
    animeId: number,
    episode: number,
    language: WatchedEpisodeEntry['language'] = 'sub',
  ) => {
    const safeLanguage: WatchedEpisodeEntry['language'] = toWatchLanguage(language)

    watchedEpisodes.value = watchedEpisodes.value.filter(
      (entry) => entry.id !== animeId || entry.episode !== episode || entry.language !== safeLanguage,
    )

    persistWatchedEpisodes()
  }

  const toggleEpisodeWatched = (entry: Omit<WatchedEpisodeEntry, 'watchedAt'>) => {
    if (isEpisodeWatched(entry.id, entry.episode, entry.language)) {
      unmarkEpisodeWatched(entry.id, entry.episode, entry.language)
      return false
    }

    markEpisodeWatched(entry)
    return true
  }

  const clearWatchedEpisodes = (animeId?: number, language?: WatchLanguage) => {
    const safeLanguage = language ? toWatchLanguage(language) : undefined

    watchedEpisodes.value = animeId
      ? watchedEpisodes.value.filter(
          (entry) => entry.id !== animeId || (safeLanguage !== undefined && entry.language !== safeLanguage),
        )
      : []
    persistWatchedEpisodes()

    if (animeId) {
      syncWatchlistStatusFromProgress(animeId)
    }
  }

  const getEpisodeNote = (animeId: number, episode: number, language: WatchLanguage = 'sub') => {
    const safeLanguage = toWatchLanguage(language)

    return episodeNotes.value.find(
      (entry) => entry.id === animeId && entry.episode === episode && entry.language === safeLanguage,
    )
  }

  const updateEpisodeNote = (entry: Omit<EpisodeNoteEntry, 'updatedAt'>) => {
    if (!entry.id || !entry.title || !entry.episode) return

    const note = String(entry.note || '')
      .trim()
      .slice(0, 500)
    const safeLanguage = toWatchLanguage(entry.language)

    if (!note) {
      episodeNotes.value = episodeNotes.value.filter(
        (item) => item.id !== entry.id || item.episode !== entry.episode || item.language !== safeLanguage,
      )
      persistEpisodeNotes()
      return
    }

    episodeNotes.value = [
      {
        ...entry,
        image: entry.image || '',
        episode: Math.trunc(toSafeNumber(entry.episode)),
        language: safeLanguage,
        note,
        updatedAt: Date.now(),
      },
      ...episodeNotes.value.filter(
        (item) => item.id !== entry.id || item.episode !== entry.episode || item.language !== safeLanguage,
      ),
    ].slice(0, episodeNotesLimit)

    persistEpisodeNotes()
  }

  const getEpisodeReaction = (animeId: number, episode: number, language: WatchLanguage = 'sub') => {
    const safeLanguage = toWatchLanguage(language)

    return episodeReactions.value.find(
      (entry) => entry.id === animeId && entry.episode === episode && entry.language === safeLanguage,
    )
  }

  const updateEpisodeReaction = (entry: EpisodeReactionInput) => {
    if (!entry.id || !entry.title || !entry.episode) return

    const safeLanguage = toWatchLanguage(entry.language)
    const reaction = toEpisodeReaction(entry.reaction)
    const isDifferentEpisode = (item: EpisodeReactionEntry) =>
      item.id !== entry.id || item.episode !== entry.episode || item.language !== safeLanguage

    if (!reaction) {
      episodeReactions.value = episodeReactions.value.filter(isDifferentEpisode)
      persistEpisodeReactions()
      return
    }

    episodeReactions.value = [
      {
        ...entry,
        image: entry.image || '',
        episode: Math.trunc(toSafeNumber(entry.episode)),
        language: safeLanguage,
        reaction,
        updatedAt: Date.now(),
      },
      ...episodeReactions.value.filter(isDifferentEpisode),
    ].slice(0, episodeReactionsLimit)

    persistEpisodeReactions()
  }

  const markEpisodesWatched = (
    anime: Pick<WatchedEpisodeEntry, 'id' | 'title' | 'image' | 'language'>,
    episodes: number[],
  ) => {
    const safeLanguage = toWatchLanguage(anime.language)
    const existingKeys = new Set(watchedEpisodes.value.map((entry) => `${entry.id}:${entry.episode}:${entry.language}`))
    const nextEntries = episodes
      .map((episode) => Math.trunc(toSafeNumber(episode)))
      .filter((episode) => episode > 0)
      .filter((episode) => !existingKeys.has(`${anime.id}:${episode}:${safeLanguage}`))
      .map((episode) => ({
        id: anime.id,
        title: anime.title,
        image: anime.image || '',
        episode,
        language: safeLanguage,
        watchedAt: Date.now(),
      }))

    watchedEpisodes.value = [...nextEntries, ...watchedEpisodes.value].slice(0, watchedEpisodesLimit)
    persistWatchedEpisodes()
    syncWatchlistStatusFromProgress(anime.id)
  }

  const setEpisodesWatched = (
    anime: Pick<WatchedEpisodeEntry, 'id' | 'title' | 'image' | 'language'>,
    episodes: number[],
  ) => {
    if (!anime.id || !anime.title) return

    const safeLanguage = toWatchLanguage(anime.language)
    const normalizedEpisodes = Array.from(
      new Set(episodes.map((episode) => Math.trunc(toSafeNumber(episode))).filter((episode) => episode > 0)),
    )
    const watchedAt = Date.now()
    const nextEntries = normalizedEpisodes.map((episode) => ({
      id: anime.id,
      title: anime.title,
      image: anime.image || '',
      episode,
      language: safeLanguage,
      watchedAt,
    }))

    watchedEpisodes.value = [
      ...nextEntries,
      ...watchedEpisodes.value.filter((entry) => entry.id !== anime.id || entry.language !== safeLanguage),
    ].slice(0, watchedEpisodesLimit)
    persistWatchedEpisodes()
    syncWatchlistStatusFromProgress(anime.id)
  }

  const updateContinueWatchingProgress = (
    animeId: number,
    episode: number,
    language: ContinueWatchingEntry['language'],
    currentTime: number,
    duration: number,
    progress?: number,
  ) => {
    const safeLanguage: ContinueWatchingEntry['language'] = toWatchLanguage(language)
    const safeCurrentTime = toSafeNumber(currentTime)
    const safeDuration = toSafeNumber(duration)
    const safeProgress = toSafeProgress(progress || (safeDuration ? (safeCurrentTime / safeDuration) * 100 : 0))
    let didUpdate = false

    continueWatching.value = continueWatching.value.map((anime) => {
      if (anime.id !== animeId || anime.episode !== episode || anime.language !== safeLanguage) {
        return anime
      }

      didUpdate = true

      return {
        ...anime,
        currentTime: safeCurrentTime,
        duration: safeDuration,
        progress: safeProgress,
        updatedAt: Date.now(),
      }
    })

    if (didUpdate) {
      persistContinueWatching()
    }
  }

  const exportUserData = () => {
    return JSON.stringify(
      {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        selectedLanguage: selectedLanguage.value,
        defaultWatchLanguage: defaultWatchLanguage.value,
        shouldAdvanceAfterMarkWatched: shouldAdvanceAfterMarkWatched.value,
        watchlist: watchlist.value,
        continueWatching: continueWatching.value,
        watchedEpisodes: watchedEpisodes.value,
        episodeNotes: episodeNotes.value,
        episodeReactions: episodeReactions.value,
        recentSearches: recentSearches.value,
      },
      null,
      2,
    )
  }

  const importUserData = (rawData: string) => {
    const parsed = JSON.parse(rawData) as {
      selectedLanguage?: string
      defaultWatchLanguage?: WatchLanguage
      shouldAdvanceAfterMarkWatched?: boolean
      watchlist?: WatchlistAnime[]
      continueWatching?: ContinueWatchingEntry[]
      watchedEpisodes?: WatchedEpisodeEntry[]
      episodeNotes?: EpisodeNoteEntry[]
      episodeReactions?: EpisodeReactionEntry[]
      recentSearches?: string[]
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid backup file.')
    }

    if (parsed.selectedLanguage === 'EN' || parsed.selectedLanguage === 'RO') {
      setLanguage(parsed.selectedLanguage)
    }

    setDefaultWatchLanguage(toWatchLanguage(parsed.defaultWatchLanguage))
    setShouldAdvanceAfterMarkWatched(Boolean(parsed.shouldAdvanceAfterMarkWatched))

    if (Array.isArray(parsed.watchlist)) {
      watchlist.value = parsed.watchlist
        .map((anime) => normalizeWatchlistAnime(anime))
        .filter((anime): anime is WatchlistAnime => Boolean(anime))
        .slice(0, 50)
      persistWatchlist()
      runWatchlistSync(watchlistSyncActions?.replaceAll(watchlist.value))
    }

    if (Array.isArray(parsed.continueWatching)) {
      continueWatching.value = parsed.continueWatching
        .map((entry) => normalizeContinueWatchingEntry(entry))
        .filter((entry): entry is ContinueWatchingEntry => Boolean(entry))
        .slice(0, continueWatchingLimit)
      persistContinueWatching()
    }

    if (Array.isArray(parsed.watchedEpisodes)) {
      watchedEpisodes.value = parsed.watchedEpisodes
        .map((entry) => normalizeWatchedEpisode(entry))
        .filter((entry): entry is WatchedEpisodeEntry => Boolean(entry))
        .slice(0, watchedEpisodesLimit)
      persistWatchedEpisodes()
    }

    if (Array.isArray(parsed.episodeNotes)) {
      episodeNotes.value = parsed.episodeNotes
        .map((entry) => normalizeEpisodeNote(entry))
        .filter((entry): entry is EpisodeNoteEntry => Boolean(entry))
        .slice(0, episodeNotesLimit)
      persistEpisodeNotes()
    }

    if (Array.isArray(parsed.episodeReactions)) {
      episodeReactions.value = parsed.episodeReactions
        .map((entry) => normalizeEpisodeReaction(entry))
        .filter((entry): entry is EpisodeReactionEntry => Boolean(entry))
        .slice(0, episodeReactionsLimit)
      persistEpisodeReactions()
    }

    if (Array.isArray(parsed.recentSearches)) {
      recentSearches.value = parsed.recentSearches
        .map((query) => String(query || '').trim())
        .filter(Boolean)
        .slice(0, recentSearchesLimit)
      persistRecentSearches()
    }
  }

  const addRecentSearch = (query: string) => {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 2) return

    recentSearches.value = [
      trimmedQuery,
      ...recentSearches.value.filter((item) => item.toLowerCase() !== trimmedQuery.toLowerCase()),
    ].slice(0, recentSearchesLimit)

    persistRecentSearches()
  }

  const removeRecentSearch = (query: string) => {
    recentSearches.value = recentSearches.value.filter((item) => item.toLowerCase() !== query.toLowerCase())
    persistRecentSearches()
  }

  const clearRecentSearches = () => {
    recentSearches.value = []
    persistRecentSearches()
  }

  const clearProgress = () => {
    continueWatching.value = []
    watchedEpisodes.value = []
    episodeNotes.value = []
    episodeReactions.value = []
    persistContinueWatching()
    persistWatchedEpisodes()
    persistEpisodeNotes()
    persistEpisodeReactions()
  }

  const removeToast = (toastId: number) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== toastId)
  }

  const pushToast = (message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)

    toasts.value = [{ id, message, tone }, ...toasts.value].slice(0, 4)

    if (import.meta.client) {
      window.setTimeout(() => {
        removeToast(id)
      }, 2600)
    }
  }

  return {
    selectedLanguage,
    defaultWatchLanguage,
    shouldAdvanceAfterMarkWatched,
    watchlist,
    watchlistCount,
    continueWatching,
    watchedEpisodes,
    episodeNotes,
    episodeReactions,
    recentSearches,
    toasts,
    hydrate,
    setLanguage,
    toggleLanguage,
    setDefaultWatchLanguage,
    setShouldAdvanceAfterMarkWatched,
    isInWatchlist,
    setWatchlistSyncActions,
    replaceWatchlist,
    toggleWatchlist,
    updateWatchlistStatus,
    updateWatchlistNote,
    clearWatchlist,
    getWatchlistProgress,
    getContinueWatching,
    setContinueWatching,
    clearContinueWatching,
    isEpisodeWatched,
    markEpisodeWatched,
    unmarkEpisodeWatched,
    toggleEpisodeWatched,
    clearWatchedEpisodes,
    getEpisodeNote,
    updateEpisodeNote,
    getEpisodeReaction,
    updateEpisodeReaction,
    markEpisodesWatched,
    setEpisodesWatched,
    updateContinueWatchingProgress,
    exportUserData,
    importUserData,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    clearProgress,
    pushToast,
    removeToast,
  }
})
