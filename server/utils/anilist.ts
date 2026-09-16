type AniListBannerResponse = {
  data?: {
    Media?: {
      bannerImage?: string | null
    } | null
  }
}

export type AniListStreamingEpisode = {
  title?: string
  url?: string
  site?: string
  thumbnail?: string
}

export type AniListAnimeSupplement = {
  bannerImage: string
  streamingEpisodes: AniListStreamingEpisode[]
}

type AniListAnimeSupplementResponse = {
  data?: {
    Media?: {
      bannerImage?: string | null
      streamingEpisodes?: Array<{
        title?: string | null
        url?: string | null
        site?: string | null
        thumbnail?: string | null
      }> | null
    } | null
  }
}

type AniListEpisodeMedia = {
  idMal?: number | null
  status?: string | null
  episodes?: number | null
  nextAiringEpisode?: {
    episode?: number | null
  } | null
}

type AniListEpisodeAvailabilityResponse = {
  data?: Record<string, AniListEpisodeMedia | null>
}

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co'
const ANILIST_FETCH_TIMEOUT_MS = 4_000
const emptyAnimeSupplement = (): AniListAnimeSupplement => ({
  bannerImage: '',
  streamingEpisodes: [],
})

const toOptionalString = (value?: string | null) => value?.trim() || undefined

const toSafeEpisodeCount = (value?: number | null) => {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 0
}

const getReleasedEpisodeCount = (media: AniListEpisodeMedia) => {
  const status = media.status?.toUpperCase()

  if (status === 'NOT_YET_RELEASED') {
    return 0
  }

  if (status === 'RELEASING') {
    const nextEpisode = toSafeEpisodeCount(media.nextAiringEpisode?.episode)

    return nextEpisode ? Math.max(nextEpisode - 1, 0) : 0
  }

  return toSafeEpisodeCount(media.episodes)
}

export const fetchAniListReleasedEpisodeCounts = async (malIds: number[]): Promise<Map<number, number>> => {
  const safeMalIds = Array.from(new Set(malIds.filter((id) => Number.isInteger(id) && id > 0))).slice(0, 50)

  if (!safeMalIds.length) {
    return new Map()
  }

  const mediaQueries = safeMalIds
    .map(
      (malId, index) => `
        anime${index}: Media(idMal: ${malId}, type: ANIME) {
          idMal
          status
          episodes
          nextAiringEpisode {
            episode
          }
        }
      `,
    )
    .join('\n')

  try {
    const response = await $fetch<AniListEpisodeAvailabilityResponse>(ANILIST_GRAPHQL_URL, {
      method: 'POST',
      body: {
        query: `query AnimeEpisodeAvailability { ${mediaQueries} }`,
      },
      retry: 1,
      retryDelay: 250,
      timeout: ANILIST_FETCH_TIMEOUT_MS,
    })
    const releasedEpisodeCounts = new Map<number, number>()

    Object.values(response.data || {}).forEach((media) => {
      const malId = toSafeEpisodeCount(media?.idMal)

      if (!media || !malId) return

      releasedEpisodeCounts.set(malId, getReleasedEpisodeCount(media))
    })

    return releasedEpisodeCounts
  } catch {
    return new Map()
  }
}

export const fetchAniListAnimeSupplement = async (malId: number): Promise<AniListAnimeSupplement> => {
  if (!Number.isInteger(malId) || malId <= 0) {
    return emptyAnimeSupplement()
  }

  try {
    const response = await $fetch<AniListAnimeSupplementResponse>(ANILIST_GRAPHQL_URL, {
      method: 'POST',
      body: {
        query: `
          query AnimeSupplement($idMal: Int) {
            Media(idMal: $idMal, type: ANIME) {
              bannerImage
              streamingEpisodes {
                title
                url
                site
                thumbnail
              }
            }
          }
        `,
        variables: {
          idMal: malId,
        },
      },
      retry: 1,
      retryDelay: 250,
      timeout: ANILIST_FETCH_TIMEOUT_MS,
    })

    const media = response.data?.Media

    return {
      bannerImage: media?.bannerImage?.trim() || '',
      streamingEpisodes:
        media?.streamingEpisodes
          ?.map((episode) => ({
            title: toOptionalString(episode.title),
            url: toOptionalString(episode.url),
            site: toOptionalString(episode.site),
            thumbnail: toOptionalString(episode.thumbnail),
          }))
          .filter((episode) => episode.title) || [],
    }
  } catch {
    return emptyAnimeSupplement()
  }
}

export const fetchAniListAnimeBanner = async (malId: number): Promise<string> => {
  try {
    const response = await $fetch<AniListBannerResponse>(ANILIST_GRAPHQL_URL, {
      method: 'POST',
      body: {
        query: `
          query AnimeBanner($idMal: Int) {
            Media(idMal: $idMal, type: ANIME) {
              bannerImage
            }
          }
        `,
        variables: {
          idMal: malId,
        },
      },
      timeout: ANILIST_FETCH_TIMEOUT_MS,
    })

    return response.data?.Media?.bannerImage?.trim() || ''
  } catch {
    return ''
  }
}
