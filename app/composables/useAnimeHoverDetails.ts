export type AnimeHoverDetails = {
  id: number
  title?: {
    english?: string
    romaji?: string
    native?: string
    userPreferred?: string
  }
  description?: string
  format?: string
  status?: string
  episodes?: number
  duration?: number
  season?: string
  seasonYear?: number
  averageScore?: number
  genres?: string[]
  synonyms?: string[]
  coverImage?: {
    large?: string
    extraLarge?: string
    color?: string
  }
  studios?: {
    nodes?: Array<{
      id: number
      name: string
    }>
  }
}

const hoverDetailsCache = new Map<number, AnimeHoverDetails>()
const hoverDetailsInFlight = new Map<number, Promise<AnimeHoverDetails>>()
const hoverDetailsCooldown = new Map<number, number>()
const maxHoverCacheItems = 80
const hoverCooldownMs = 30_000

const setCachedHoverDetails = (animeId: number, details: AnimeHoverDetails) => {
  if (hoverDetailsCache.size >= maxHoverCacheItems) {
    const oldestKey = hoverDetailsCache.keys().next().value

    if (oldestKey) {
      hoverDetailsCache.delete(oldestKey)
    }
  }

  hoverDetailsCache.set(animeId, details)
}

export const useAnimeHoverDetails = () => {
  const getAnimeHoverDetails = async (animeId: number) => {
    const cachedDetails = hoverDetailsCache.get(animeId)

    if (cachedDetails) {
      return cachedDetails
    }

    const cooldownUntil = hoverDetailsCooldown.get(animeId) || 0

    if (Date.now() < cooldownUntil) {
      throw new Error('Anime hover details request is cooling down')
    }

    const currentRequest = hoverDetailsInFlight.get(animeId)

    if (currentRequest) {
      return currentRequest
    }

    const request = $fetch<AnimeHoverDetails>(`/api/myanimelist/hover/${animeId}`)
      .then((details) => {
        setCachedHoverDetails(animeId, details)

        return details
      })
      .catch((error) => {
        hoverDetailsCooldown.set(animeId, Date.now() + hoverCooldownMs)

        if (import.meta.dev && !String(error).includes('NetworkError')) {
          console.debug('Anime hover details unavailable:', error)
        }

        throw error
      })
      .finally(() => {
        hoverDetailsInFlight.delete(animeId)
      })

    hoverDetailsInFlight.set(animeId, request)

    return request
  }

  return {
    getAnimeHoverDetails,
  }
}
