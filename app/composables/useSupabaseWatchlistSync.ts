import type { WatchStopHandle } from 'vue'

import { WATCHLIST_STATUSES, type WatchlistAnime, type WatchlistStatus } from '~/stores/userPreferences'

type WatchlistRow = {
  anime_id: number
  title: string
  image: string | null
  episodes: number | null
  note: string | null
  status: string
  added_at: string
  updated_at: string
}

let stopWatchlistSync: WatchStopHandle | null = null
let loadRequestId = 0

const toTimestamp = (value: string | null | undefined) => {
  const timestamp = Date.parse(value || '')

  return Number.isFinite(timestamp) ? timestamp : Date.now()
}

const toIsoTimestamp = (value: number | undefined) => {
  const timestamp = Number(value) || Date.now()

  return new Date(timestamp).toISOString()
}

const toWatchlistStatus = (value: string): WatchlistStatus => {
  return WATCHLIST_STATUSES.some((status) => status.value === value) ? (value as WatchlistStatus) : 'plan-to-watch'
}

const fromWatchlistRow = (row: WatchlistRow): WatchlistAnime => {
  return {
    id: row.anime_id,
    title: row.title,
    image: row.image || '',
    episodes: row.episodes || undefined,
    note: row.note || '',
    status: toWatchlistStatus(row.status),
    addedAt: toTimestamp(row.added_at),
    updatedAt: toTimestamp(row.updated_at),
  }
}

const toWatchlistRow = (anime: WatchlistAnime, userId: string) => {
  return {
    user_id: userId,
    anime_id: anime.id,
    title: anime.title,
    image: anime.image || '',
    episodes: anime.episodes || null,
    note: anime.note || '',
    status: anime.status,
    added_at: toIsoTimestamp(anime.addedAt),
    updated_at: toIsoTimestamp(anime.updatedAt),
  }
}

export const useSupabaseWatchlistSync = () => {
  const supabase = useNuxtApp().$supabase || null
  const auth = useSupabaseAuth()
  const userPreferences = useUserPreferencesStore()
  const isLoading = useState('noxy-watchlist-sync-loading', () => false)
  const errorMessage = useState('noxy-watchlist-sync-error', () => '')

  const requireUserId = () => {
    const userId = auth.user.value?.id

    if (!supabase || !userId) {
      throw new Error('Sign in to sync your watchlist.')
    }

    return userId
  }

  const upsert = async (anime: WatchlistAnime) => {
    const userId = requireUserId()
    const { error } = await supabase!.from('anime_watchlist').upsert(toWatchlistRow(anime, userId), {
      onConflict: 'user_id,anime_id',
    })

    if (error) throw error
  }

  const remove = async (animeId: number) => {
    const userId = requireUserId()
    const { error } = await supabase!.from('anime_watchlist').delete().eq('user_id', userId).eq('anime_id', animeId)

    if (error) throw error
  }

  const clear = async () => {
    const userId = requireUserId()
    const { error } = await supabase!.from('anime_watchlist').delete().eq('user_id', userId)

    if (error) throw error
  }

  const replaceAll = async (entries: WatchlistAnime[]) => {
    const userId = requireUserId()
    const { error: deleteError } = await supabase!.from('anime_watchlist').delete().eq('user_id', userId)

    if (deleteError) throw deleteError
    if (!entries.length) return

    const { error } = await supabase!.from('anime_watchlist').upsert(
      entries.map((anime) => toWatchlistRow(anime, userId)),
      { onConflict: 'user_id,anime_id' },
    )

    if (error) throw error
  }

  const loadWatchlist = async () => {
    if (!supabase || !auth.user.value?.id) return

    const userId = auth.user.value.id
    const requestId = ++loadRequestId
    isLoading.value = true
    errorMessage.value = ''

    try {
      const { data, error } = await supabase
        .from('anime_watchlist')
        .select('anime_id, title, image, episodes, note, status, added_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      if (requestId !== loadRequestId || auth.user.value?.id !== userId) return

      userPreferences.replaceWatchlist(((data || []) as WatchlistRow[]).map(fromWatchlistRow), { persist: false })
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unable to load your watchlist.'
      console.error('Watchlist load error:', error)
      userPreferences.pushToast('Unable to load your synced watchlist', 'error')
    } finally {
      if (requestId === loadRequestId) {
        isLoading.value = false
      }
    }
  }

  const startWatchlistSync = () => {
    if (!import.meta.client || stopWatchlistSync) return

    stopWatchlistSync = watch(
      () => auth.user.value?.id || '',
      async (userId) => {
        loadRequestId += 1

        if (!supabase || !userId) {
          userPreferences.setWatchlistSyncActions(null)
          userPreferences.replaceWatchlist([], { persist: false })
          return
        }

        userPreferences.setWatchlistSyncActions({
          upsert,
          remove,
          clear,
          replaceAll,
        })
        await loadWatchlist()
      },
      { immediate: true },
    )
  }

  return {
    isLoading,
    errorMessage,
    startWatchlistSync,
    loadWatchlist,
  }
}
