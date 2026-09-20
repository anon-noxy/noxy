import {
  hasBlockedAnime,
  hasBlockedFranchiseText,
  fetchMalAnimeDetails,
  hasListExcludedGenre,
  toMappedDetails,
  toMappedRelation,
  toSafeGenres,
  type MalAnime,
  type MappedDetails,
} from '../../utils/mal'
import { fetchAniListAnimeSupplement, fetchAniListReleasedEpisodeCounts } from '../../utils/anilist'

type MappedRelation = MappedDetails['relations']['nodes'][number]
type DetailsCacheResult =
  | {
      ok: true
      data: MappedDetails
    }
  | {
      ok: false
      statusCode: number
      statusMessage: string
    }

const toMissingAnimeResult = (statusCode = 404, statusMessage = 'Anime not found.'): DetailsCacheResult => ({
  ok: false,
  statusCode,
  statusMessage,
})

const getResponseStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined

  const maybeError = error as { response?: { status?: number }; status?: number; statusCode?: number }

  return maybeError.statusCode || maybeError.status || maybeError.response?.status
}

const blockedRelatedFormats = new Set(['MUSIC', 'CM', 'ONA', 'GENRE', 'TV_SHORT'])
const blockedRelatedGenres = new Set(['MUSIC'])
const timelineRelationTypes = new Set(['PREQUEL', 'SEQUEL'])
const maxSeasonRelationHops = 12
const seasonFormatPriority: Record<string, number> = {
  TV: 0,
  ONA: 1,
  OVA: 2,
  MOVIE: 3,
  SPECIAL: 4,
}

const hasBlockedRelatedGenre = (genres?: Array<{ name?: string } | string> | null) => {
  if (hasListExcludedGenre(genres || undefined)) {
    return true
  }

  return Boolean(
    genres?.some((genre) =>
      blockedRelatedGenres.has((typeof genre === 'string' ? genre : genre.name || '').trim().toUpperCase()),
    ),
  )
}

const getRelatedMediaTitleText = (media?: { title?: MappedRelation['title'] | null } | null) => {
  return [media?.title?.english, media?.title?.romaji, media?.title?.native, media?.title?.userPreferred]
    .filter(Boolean)
    .join(' ')
}

const isAllowedRelatedMedia = (
  media?: {
    format?: string
    relationType?: string
    genres?: string[] | null
    title?: MappedRelation['title'] | null
  } | null,
  options: { allowOna?: boolean } = {},
) => {
  const format = media?.format?.toUpperCase()
  const relationType = media?.relationType?.toUpperCase()
  const hasBlockedFormat = blockedRelatedFormats.has(format || '') && !(options.allowOna && format === 'ONA')

  return (
    !hasBlockedFormat &&
    !blockedRelatedFormats.has(relationType || '') &&
    !hasBlockedRelatedGenre(media?.genres) &&
    !hasBlockedFranchiseText(getRelatedMediaTitleText(media))
  )
}

const resolveAllowedFallbackRelations = async (
  event: Parameters<typeof fetchMalAnimeDetails>[0],
  relations: MappedDetails['relations']['nodes'],
) => {
  const checkedRelations = await Promise.all(
    relations.map(async (relation) => {
      if (relation.genres?.length) {
        return isAllowedRelatedMedia(relation) ? relation : undefined
      }

      try {
        const relationDetails = await fetchMalAnimeDetails(event, relation.id)
        const hydratedRelation = toMappedRelation(relationDetails, relation.relationType)

        return isAllowedRelatedMedia(hydratedRelation) ? hydratedRelation : undefined
      } catch {
        return isAllowedRelatedMedia(relation) ? relation : undefined
      }
    }),
  )

  return checkedRelations.filter((relation): relation is MappedDetails['relations']['nodes'][number] =>
    Boolean(relation),
  )
}

const getRelationDateKey = (media: MappedRelation) => {
  const year = media.startDate?.year || media.seasonYear || 0
  const month = media.startDate?.month || 0
  const day = media.startDate?.day || 0

  return year * 10000 + month * 100 + day
}

const getSeasonFormatPriority = (format?: string) => {
  return seasonFormatPriority[format?.toUpperCase() || ''] ?? 5
}

const getRelationTitleText = (media?: MappedRelation) => {
  return [media?.title.english, media?.title.userPreferred, media?.title.romaji, media?.title.native]
    .filter(Boolean)
    .join(' ')
}

const hasMainSeasonCue = (value: string) => {
  return /\b(?:season|part|cour|chapter|arc|final|kanketsu|2nd|3rd|4th|5th|second|third|fourth|fifth)\b/i.test(value)
}

const hasSideStoryCue = (value: string) => {
  return /\b(?:ova|recap|summary|digest|chronicle|junior high|chibi|picture drama|side stories?|spin[-\s]?off|gaiden|no regrets|lost girls|before the fall|kuinaki sentaku)\b/i.test(
    value,
  )
}

const isMainSeasonRelation = (media?: MappedRelation) => {
  if (!media?.id || !isAllowedRelatedMedia(media, { allowOna: true })) {
    return false
  }

  const titleText = getRelationTitleText(media)
  const hasMainCue = hasMainSeasonCue(titleText)

  if (hasSideStoryCue(titleText) && !hasMainCue) {
    return false
  }

  const format = media.format?.toUpperCase()

  if (format === 'TV') {
    return true
  }

  if (hasMainCue) {
    return true
  }

  return format === 'ONA' && (media.episodes || 0) >= 4
}

const isSeasonRelation = (media?: MappedRelation) => {
  const relationType = media?.relationType?.toUpperCase() || ''

  return Boolean(media?.id) && timelineRelationTypes.has(relationType) && isMainSeasonRelation(media)
}

const compareSeasonRelation = (relationType: 'PREQUEL' | 'SEQUEL') => {
  return (first: MappedRelation, second: MappedRelation) => {
    const formatDiff = getSeasonFormatPriority(first.format) - getSeasonFormatPriority(second.format)

    if (formatDiff) {
      return formatDiff
    }

    const dateDiff = getRelationDateKey(first) - getRelationDateKey(second)

    if (dateDiff) {
      return relationType === 'PREQUEL' ? -dateDiff : dateDiff
    }

    return first.id - second.id
  }
}

const selectSeasonRelation = (
  relations: MappedRelation[],
  relationType: 'PREQUEL' | 'SEQUEL',
  seenIds: Set<number>,
) => {
  return (
    relations
      .filter((media): media is MappedRelation => {
        if (!media?.id || !isSeasonRelation(media)) {
          return false
        }

        return media.relationType === relationType && !seenIds.has(media.id)
      })
      .sort(compareSeasonRelation(relationType))[0] || undefined
  )
}

const uniqueSeasonRelations = (items: MappedRelation[]) => {
  const seenIds = new Set<number>()

  return items.filter((item) => {
    if (seenIds.has(item.id)) {
      return false
    }

    seenIds.add(item.id)
    return true
  })
}

const toCurrentSeasonRelation = (details: MappedDetails): MappedRelation => ({
  id: details.id,
  title: details.title,
  coverImage: {
    extraLarge: details.coverImage.extraLarge,
    large: details.coverImage.large,
    color: details.coverImage.color,
  },
  format: details.format,
  status: details.status,
  averageScore: details.averageScore,
  episodes: details.episodes,
  genres: toSafeGenres(details.genres),
  season: details.season,
  seasonYear: details.seasonYear,
  startDate: details.startDate,
  relationType: 'CURRENT',
})

const resolveSeasonRelations = async (
  event: Parameters<typeof fetchMalAnimeDetails>[0],
  details: MappedDetails,
  fallbackRelations: MappedRelation[],
) => {
  const currentSeason = toCurrentSeasonRelation(details)
  const seenIds = new Set<number>([currentSeason.id])
  const timelineRelationCache = new Map<number, MappedRelation[]>([[currentSeason.id, fallbackRelations]])

  const getTimelineRelations = async (malId: number) => {
    if (timelineRelationCache.has(malId)) {
      return timelineRelationCache.get(malId) || []
    }

    let relations: MappedRelation[] = []

    try {
      const media = await fetchMalAnimeDetails(event, malId)

      relations = await resolveAllowedFallbackRelations(event, toMappedDetails(media).relations.nodes)
    } catch {
      relations = []
    }

    timelineRelationCache.set(malId, relations)
    return relations
  }

  const walkSeasonChain = async (relationType: 'PREQUEL' | 'SEQUEL') => {
    const chain: MappedRelation[] = []
    let cursorId = currentSeason.id

    for (let hop = 0; hop < maxSeasonRelationHops; hop += 1) {
      const nextSeason = selectSeasonRelation(await getTimelineRelations(cursorId), relationType, seenIds)

      if (!nextSeason) {
        break
      }

      chain.push(nextSeason)
      seenIds.add(nextSeason.id)
      cursorId = nextSeason.id
    }

    return chain
  }

  const prequels = await walkSeasonChain('PREQUEL')
  const sequels = await walkSeasonChain('SEQUEL')
  const currentSeasonItems = isMainSeasonRelation(currentSeason) ? [currentSeason] : []
  const recursiveChain = uniqueSeasonRelations([...prequels.reverse(), ...currentSeasonItems, ...sequels])

  if (recursiveChain.length > 1) {
    return recursiveChain
  }

  const directPrequels = fallbackRelations
    .filter((media) => isSeasonRelation(media) && media.relationType === 'PREQUEL')
    .sort(compareSeasonRelation('PREQUEL'))
  const directSequels = fallbackRelations
    .filter((media) => isSeasonRelation(media) && media.relationType === 'SEQUEL')
    .sort(compareSeasonRelation('SEQUEL'))
  const directChain = uniqueSeasonRelations([...directPrequels, ...currentSeasonItems, ...directSequels])

  return directChain.length > 1 ? directChain : []
}

const handler = defineCachedEventHandler(
  async (event): Promise<DetailsCacheResult> => {
    const id = Number(getRouterParam(event, 'id'))

    if (!Number.isInteger(id) || id <= 0) {
      return toMissingAnimeResult(400, 'A valid MAL id is required.')
    }

    let response: MalAnime

    try {
      response = await fetchMalAnimeDetails(event, id)
    } catch (error) {
      if (getResponseStatusCode(error) === 404) {
        return toMissingAnimeResult()
      }

      throw error
    }

    if (!response?.id || hasBlockedAnime(response)) {
      return toMissingAnimeResult()
    }

    const details = toMappedDetails(response)
    const animeSupplementPromise = fetchAniListAnimeSupplement(response.id)
    const relations = await resolveAllowedFallbackRelations(event, details.relations.nodes)
    const [animeSupplement, seasonRelations, releasedEpisodeCounts] = await Promise.all([
      animeSupplementPromise,
      resolveSeasonRelations(event, details, relations),
      fetchAniListReleasedEpisodeCounts([response.id]),
    ])
    const releasedEpisodeCount = releasedEpisodeCounts.get(response.id) || 0
    const hasReleasedEpisodeOverride = details.status === 'RELEASING' && releasedEpisodeCount > 0
    const nextAiringEpisode = hasReleasedEpisodeOverride
      ? {
          airingAt: details.nextAiringEpisode?.airingAt || 0,
          episode: releasedEpisodeCount + 1,
          timeUntilAiring: details.nextAiringEpisode?.timeUntilAiring || 0,
        }
      : details.nextAiringEpisode

    return {
      ok: true,
      data: {
        ...details,
        episodes: hasReleasedEpisodeOverride ? releasedEpisodeCount : details.episodes,
        nextAiringEpisode,
        bannerImage: animeSupplement.bannerImage,
        streamingEpisodes: animeSupplement.streamingEpisodes,
        genres: toSafeGenres(details.genres),
        relations: {
          nodes: relations,
        },
        seasonRelations: {
          nodes: seasonRelations,
        },
      },
    }
  },
  {
    maxAge: 60 * 60,
    name: 'mal-anime-details-episode-titles-v20',
    getKey: (event) => `v20:${getRouterParam(event, 'id')}`,
  },
)

export default defineEventHandler(async (event): Promise<MappedDetails> => {
  const result = await handler(event)

  if (!result.ok) {
    throw createError({
      statusCode: result.statusCode,
      statusMessage: result.statusMessage,
    })
  }

  return result.data
})
