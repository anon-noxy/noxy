import type { WatchlistAnimeInput } from '~/stores/userPreferences'

export type WatchlistToggleAnime = WatchlistAnimeInput

export const useAnimeWatchlist = () => {
  const userPreferences = useUserPreferencesStore()
  const announcer = useAnnouncer()
  const auth = useSupabaseAuth()
  const route = useRoute()
  const { openAuthModal } = useAuthModal()

  const isAnimeSaved = (animeId?: number) => {
    return Boolean(auth.isAuthenticated.value && animeId && userPreferences.isInWatchlist(animeId))
  }

  const toggleAnimeSaved = (anime?: WatchlistToggleAnime | null) => {
    if (!anime) return

    if (!auth.isAuthenticated.value) {
      const message = 'Sign in to use your watchlist'

      userPreferences.pushToast(message, 'info')
      announcer.polite(message)

      openAuthModal('login', route.fullPath)

      return
    }

    const wasSaved = userPreferences.isInWatchlist(anime.id)

    const message = wasSaved ? `${anime.title} removed from watchlist` : `${anime.title} added to watchlist`

    userPreferences.toggleWatchlist(anime)
    userPreferences.pushToast(message, wasSaved ? 'info' : 'success')
    announcer.polite(message)
  }

  return {
    isAnimeSaved,
    toggleAnimeSaved,
    userPreferences,
  }
}
