import type { H3Event } from 'h3'
import { setResponseHeader } from 'h3'
import type { $Fetch } from 'ofetch'
import {
  createServiceUnavailableError,
  getErrorRetryAfterSeconds,
  isTransientUpstreamError,
  setRetryAfter,
  toPositiveIntegerConfig,
} from './resilience'

type MalPicture = {
  medium?: string
  large?: string
}

type MalAlternativeTitles = {
  en?: string
  ja?: string
  synonyms?: string[]
}

type MalGenre = {
  id: number
  name: string
}

type MalStudio = {
  id: number
  name: string
}

type MalSeason = {
  season?: string
  year?: number
}

type MalBroadcast = {
  day_of_the_week?: string
  start_time?: string
}

export type MalEvent = H3Event

export type MalRelatedAnimeEdge = {
  node?: MalAnime
  relation_type?: string
  relation_type_formatted?: string
}

export type MalAnime = {
  id: number
  title?: string
  main_picture?: MalPicture
  alternative_titles?: MalAlternativeTitles
  start_date?: string
  end_date?: string
  synopsis?: string
  background?: string
  mean?: number
  rank?: number
  popularity?: number
  num_list_users?: number
  num_scoring_users?: number
  num_favorites?: number
  media_type?: string
  status?: string
  genres?: MalGenre[]
  num_episodes?: number
  start_season?: MalSeason
  broadcast?: MalBroadcast
  source?: string
  average_episode_duration?: number
  rating?: string
  studios?: MalStudio[]
  studio?: MalStudio
  related_anime?: MalRelatedAnimeEdge[]
}

export type MalTitle = {
  english: string
  romaji: string
  native: string
  userPreferred: string
}

export type MalFuzzyDate = {
  year?: number
  month?: number
  day?: number
}

export type MalCoverImage = {
  extraLarge: string
  large: string
  medium: string
  color: string
}

export type MalNextAiringEpisode = {
  airingAt: number
  episode: number
  timeUntilAiring: number
}

export type MalCardResult = {
  id: number
  title: string
  romajiTitle: string
  type: string
  status: string
  episodes: number
  year: number | string
  score: number
  genres: string[]
  image: string
}

type MalListItem = {
  node?: MalAnime
}

export type MalListResponse = {
  data?: MalListItem[]
  paging?: {
    next?: string
  }
}

type MalSingleResponse = MalAnime

type MalRequestQuery = Record<string, string | number | undefined>

const DEFAULT_LIST_FIELDS = [
  'id',
  'title',
  'main_picture',
  'alternative_titles',
  'media_type',
  'status',
  'num_episodes',
  'start_season',
  'start_date',
  'end_date',
  'mean',
  'genres',
  'average_episode_duration',
  'broadcast',
  'num_favorites',
  'num_list_users',
  'popularity',
  'rank',
  'studios',
  'source',
].join(',')

const DETAIL_FIELDS = [DEFAULT_LIST_FIELDS, 'synopsis', 'background', 'rating', 'related_anime'].join(',')
const MAL_FETCH_TIMEOUT_MS = 15_000
const MAL_FETCH_RETRIES = 5
const MAL_FETCH_RETRY_BASE_DELAY_MS = 250
const DEFAULT_MAL_MAX_CONCURRENT_REQUESTS = 8

type MalRequestQueueEntry = {
  maxConcurrentRequests: number
  resolve: (release: () => void) => void
}

const malRequestQueue: MalRequestQueueEntry[] = []
let activeMalRequests = 0

const drainMalRequestQueue = () => {
  let nextRequest = malRequestQueue[0]

  while (nextRequest && activeMalRequests < nextRequest.maxConcurrentRequests) {
    malRequestQueue.shift()
    activeMalRequests += 1
    nextRequest.resolve(createMalRequestRelease())
    nextRequest = malRequestQueue[0]
  }
}

const createMalRequestRelease = () => {
  let released = false

  return () => {
    if (released) return

    released = true
    activeMalRequests = Math.max(activeMalRequests - 1, 0)
    drainMalRequestQueue()
  }
}

const acquireMalRequestSlot = (maxConcurrentRequests: number) => {
  const safeMaxConcurrentRequests = Math.max(Math.trunc(maxConcurrentRequests), 1)

  if (activeMalRequests < safeMaxConcurrentRequests) {
    activeMalRequests += 1
    return Promise.resolve(createMalRequestRelease())
  }

  return new Promise<() => void>((resolve) => {
    malRequestQueue.push({
      maxConcurrentRequests: safeMaxConcurrentRequests,
      resolve,
    })
  })
}

const withMalRequestSlot = async <T>(maxConcurrentRequests: number, request: () => Promise<T>) => {
  const release = await acquireMalRequestSlot(maxConcurrentRequests)

  try {
    return await request()
  } finally {
    release()
  }
}

export const getMalRetryDelay = (remainingRetries: unknown, retryAfterValue?: string | null) => {
  const retryAfterSeconds = Number(retryAfterValue)

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(Math.ceil(retryAfterSeconds * 1000), 2_000)
  }

  const safeRemainingRetries =
    typeof remainingRetries === 'number' && Number.isFinite(remainingRetries)
      ? Math.max(Math.trunc(remainingRetries), 0)
      : MAL_FETCH_RETRIES
  const retryAttempt = Math.max(MAL_FETCH_RETRIES - safeRemainingRetries, 0)

  return MAL_FETCH_RETRY_BASE_DELAY_MS * 2 ** retryAttempt
}

const withExtraListFields = (extraFields = '') => [DEFAULT_LIST_FIELDS, extraFields].filter(Boolean).join(',')

const cleanQuery = (query: MalRequestQuery = {}): Record<string, string | number> => {
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== '')) as Record<
    string,
    string | number
  >
}

export const malFetch = async <T>(event: MalEvent, path: string, query: MalRequestQuery = {}): Promise<T> => {
  const config = useRuntimeConfig(event)
  const baseURL = config.malApiBaseUrl || 'https://api.myanimelist.net/v2'
  const maxConcurrentRequests = toPositiveIntegerConfig(
    config.malMaxConcurrentRequests,
    DEFAULT_MAL_MAX_CONCURRENT_REQUESTS,
  )

  if (!config.malClientId) {
    throw createServiceUnavailableError('Anime data is not configured.')
  }

  try {
    const upstreamFetch = $fetch as unknown as $Fetch
    const response = await withMalRequestSlot(maxConcurrentRequests, () =>
      upstreamFetch<T>(`${baseURL}${path}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-MAL-CLIENT-ID': config.malClientId,
        },
        query: cleanQuery(query),
        timeout: MAL_FETCH_TIMEOUT_MS,
        retry: MAL_FETCH_RETRIES,
        retryDelay: ({ options, response }) => getMalRetryDelay(options.retry, response?.headers.get('retry-after')),
      }),
    )

    return response as T
  } catch (error) {
    if (!isTransientUpstreamError(error)) {
      throw error
    }

    setRetryAfter(event, getErrorRetryAfterSeconds(error) || 10)
    setResponseHeader(event, 'X-Noxy-Upstream-Unavailable', 'myanimelist')

    throw createServiceUnavailableError('Anime data is temporarily unavailable. Please try again shortly.')
  }
}

export const fetchMalAnimeDetails = (event: MalEvent, id: number): Promise<MalAnime> => {
  return malFetch<MalSingleResponse>(event, `/anime/${id}`, {
    fields: DETAIL_FIELDS,
  })
}

export const fetchMalAnimeSearch = (
  event: MalEvent,
  query: string,
  limit: number,
  offset = 0,
  extraQuery: MalRequestQuery = {},
): Promise<MalListResponse> => {
  const safeQuery = query.trim()

  if (safeQuery.length < 2) {
    return Promise.resolve({
      data: [],
      paging: {},
    })
  }

  const requestQuery = {
    q: safeQuery,
    limit,
    offset,
    fields: DEFAULT_LIST_FIELDS,
    ...extraQuery,
  }

  return malFetch<MalListResponse>(event, '/anime/search', requestQuery).catch(async () =>
    malFetch<MalListResponse>(event, '/anime', requestQuery),
  )
}

export const fetchMalAnimeRanking = (
  event: MalEvent,
  rankingType: string,
  limit: number,
  offset = 0,
  extraFields = '',
): Promise<MalListResponse> => {
  return malFetch<MalListResponse>(event, '/anime/ranking', {
    ranking_type: rankingType,
    limit,
    offset,
    fields: withExtraListFields(extraFields),
  })
}

export const fetchMalSeasonalAnime = (
  event: MalEvent,
  year: number,
  season: string,
  limit: number,
  offset = 0,
  sort = 'anime_score',
  extraFields = '',
): Promise<MalListResponse> => {
  return malFetch<MalListResponse>(event, `/anime/season/${year}/${season.toLowerCase()}`, {
    limit,
    offset,
    sort,
    fields: withExtraListFields(extraFields),
  })
}

export const parseMalList = (response?: MalListResponse): MalAnime[] => {
  return (
    response?.data
      ?.map((item) => item.node)
      .filter((item): item is MalAnime => {
        if (!item?.id) {
          return false
        }

        return !hasListExcludedAnime(item)
      }) || []
  )
}

export const hasNextPage = (response?: MalListResponse): boolean => {
  return Boolean(response?.paging?.next)
}

export type MalPageInfo = {
  total: number
  currentPage: number
  hasNextPage: boolean
}

export const buildPageInfo = (page: number, perPage: number, next = false, total?: number): MalPageInfo => ({
  total: total ?? (page - 1) * perPage + (next ? perPage + 1 : perPage),
  currentPage: page,
  hasNextPage: next,
})

export const toTitleObject = (anime?: MalAnime): MalTitle => ({
  english: anime?.alternative_titles?.en || '',
  romaji: anime?.title || anime?.alternative_titles?.en || anime?.alternative_titles?.ja || '',
  native: anime?.alternative_titles?.ja || '',
  userPreferred: anime?.title || anime?.alternative_titles?.en || anime?.alternative_titles?.ja || '',
})

export const parseDatePart = (value?: string, index = 0): number | undefined => {
  if (!value) return undefined
  const parts = value.split('-')
  const part = Number(parts[index])

  return Number.isInteger(part) && part > 0 ? part : undefined
}

export const getCompletionDate = (anime: Pick<MalAnime, 'end_date' | 'start_date'>): string | undefined => {
  return anime.end_date || anime.start_date
}

export const isCompletedInYear = (anime: Pick<MalAnime, 'end_date' | 'start_date' | 'status'>, year: number) => {
  return anime.status === 'finished_airing' && parseDatePart(getCompletionDate(anime), 0) === year
}

export const isCompletedTvSeriesInYear = (
  anime: Pick<MalAnime, 'end_date' | 'start_date' | 'status' | 'media_type'>,
  year: number,
) => {
  return anime.media_type === 'tv' && isCompletedInYear(anime, year)
}

export const toFuzzyDate = (value?: string): MalFuzzyDate => ({
  year: parseDatePart(value, 0),
  month: parseDatePart(value, 1),
  day: parseDatePart(value, 2),
})

export const toSeason = (season?: string): string | undefined => {
  return season ? season.toUpperCase() : undefined
}

export const toFormat = (mediaType?: string): string => {
  const value = (mediaType || 'anime').toUpperCase()

  if (value === 'TV') return 'TV'
  if (value === 'OVA') return 'OVA'
  if (value === 'ONA') return 'ONA'
  if (value === 'MOVIE') return 'MOVIE'
  if (value === 'SPECIAL') return 'SPECIAL'
  if (value === 'MUSIC') return 'MUSIC'

  return value
}

export const toStatus = (status?: string): string | undefined => {
  if (!status) return undefined

  const map: Record<string, string> = {
    finished_airing: 'FINISHED',
    currently_airing: 'RELEASING',
    not_yet_aired: 'NOT_YET_RELEASED',
  }

  return map[status] || status.toUpperCase()
}

export const toSource = (source?: string): string | undefined => {
  return source ? source.toUpperCase() : undefined
}

const blockedGenres = new Set(['hentai'])
const listExcludedGenres = new Set(['kids', 'pets'])
const safeGenreExclusions = new Set([...blockedGenres, ...listExcludedGenres])
const blockedMediaTypes = new Set(['cm'])
const blockedFranchisePatterns = [/\btom\s+(?:and|&|to)\s+jerry\b/i, /\blooney\s+tunes\b/i]

export const hasBlockedFranchiseText = (value?: string): boolean => {
  return Boolean(value && blockedFranchisePatterns.some((pattern) => pattern.test(value)))
}

const toAnimeSearchText = (
  anime?: Pick<MalAnime, 'title' | 'alternative_titles' | 'synopsis' | 'background'>,
): string => {
  return [
    anime?.title,
    anime?.alternative_titles?.en,
    anime?.alternative_titles?.ja,
    ...(anime?.alternative_titles?.synonyms || []),
    anime?.synopsis,
    anime?.background,
  ]
    .filter(Boolean)
    .join(' ')
}

export const hasBlockedGenre = (genres?: Array<{ name?: string } | string>): boolean => {
  return Boolean(
    genres?.some((genre) => {
      const name = typeof genre === 'string' ? genre : genre.name || ''

      return blockedGenres.has(name.trim().toLowerCase())
    }),
  )
}

export const hasListExcludedGenre = (genres?: Array<{ name?: string } | string>): boolean => {
  return Boolean(
    genres?.some((genre) => {
      const name = typeof genre === 'string' ? genre : genre.name || ''

      return safeGenreExclusions.has(name.trim().toLowerCase())
    }),
  )
}

export const hasBlockedMediaType = (mediaType?: string): boolean => {
  return blockedMediaTypes.has((mediaType || '').trim().toLowerCase())
}

export const hasBlockedAnime = (
  anime?: Pick<MalAnime, 'genres' | 'title' | 'alternative_titles' | 'synopsis' | 'background' | 'media_type'>,
): boolean => {
  return Boolean(
    anime &&
    (hasBlockedMediaType(anime.media_type) ||
      hasBlockedGenre(anime.genres) ||
      hasBlockedFranchiseText(toAnimeSearchText(anime))),
  )
}

export const hasListExcludedAnime = (
  anime?: Pick<MalAnime, 'genres' | 'title' | 'alternative_titles' | 'synopsis' | 'background' | 'media_type'>,
): boolean => {
  return Boolean(
    anime &&
    (hasBlockedMediaType(anime.media_type) ||
      hasListExcludedGenre(anime.genres) ||
      hasBlockedFranchiseText(toAnimeSearchText(anime))),
  )
}

export const toSafeGenres = (genres?: Array<{ name?: string } | string>): string[] => {
  return (
    genres
      ?.map((genre) => (typeof genre === 'string' ? genre : genre.name || ''))
      .filter((genre) => genre && !safeGenreExclusions.has(genre.trim().toLowerCase())) || []
  )
}

const japaneseKanaPattern = /[\u3040-\u30ff]/

const chineseOriginStudioPatterns = [
  /\bbilibili\b/i,
  /\btencent\b/i,
  /\byouku\b/i,
  /\biqiyi\b/i,
  /\bhaoliners\b/i,
  /\bb\.?\s*c\s*may\b/i,
  /\bg\.?\s*c\s*may\b/i,
  /\bsparkly\s+key\b/i,
  /\bcolored\s+pencil\b/i,
  /\bpb\s+animation\b/i,
  /\bfoch\b/i,
  /\bmotion\s+magic\b/i,
  /\bbigfirebird\b/i,
  /\bthundray\b/i,
  /\bwonder\s+cat\b/i,
  /\boriginal\s+force\b/i,
  /\bshanghai\s+animation\b/i,
  /\bchina\s+literature\b/i,
  /\bask\s+animation\b/i,
  /\bcg\s+year\b/i,
]

const chineseOriginTitlePatterns = [
  /\bdouluo\s+dalu\b/i,
  /\bbattle\s+through\s+the\s+heavens\b/i,
  /\bfights\s+break\s+sphere\b/i,
  /\bwanmei\s+shijie\b/i,
  /\bperfect\s+world\b/i,
  /\btunshi\s+xingkong\b/i,
  /\bswallowed\s+star\b/i,
  /\bxian\s+ni\b/i,
  /\brenegade\s+immortal\b/i,
  /\bfanren\s+xiu\s+xian\s+chuan\b/i,
  /\brecord\s+of\s+a\s+mortal\b/i,
  /\bmo\s+dao\s+zu\s+shi\b/i,
  /\bgrandmaster\s+of\s+demonic\s+cultivation\b/i,
  /\btian\s+guan\s+ci\s+fu\b/i,
  /\bheaven\s+official'?s\s+blessing\b/i,
  /\bquanzhi\s+fashi\b/i,
  /\bfull-?time\s+magister\b/i,
  /\bquanzhi\s+gaoshou\b/i,
  /\bking'?s\s+avatar\b/i,
  /\bwu\s+dong\s+qian\s+kun\b/i,
  /\bmartial\s+universe\b/i,
  /\bzhu\s+xian\b/i,
  /\bjade\s+dynasty\b/i,
  /\byi\s+nian\s+yong\s+heng\b/i,
  /\ba\s+will\s+eternal\b/i,
  /\bling\s+qi\b/i,
  /\bspiritpact\b/i,
  /\byao\s+shen\s+ji\b/i,
  /\btales\s+of\s+demons\s+and\s+gods\b/i,
  /\bshaonian\s+ge\s+xing\b/i,
  /\bcang\s+yuan\s+tu\b/i,
  /\bbai\s+yao\s+pu\b/i,
  /\bfairies\s+albums\b/i,
  /\bhuyao\s+xiao\s+hongniang\b/i,
  /\bfox\s+spirit\s+matchmaker\b/i,
  /\bxi\s+xing\s+ji\b/i,
  /\bshiguang\s+dailiren\b/i,
  /\blink\s+click\b/i,
  /\blong\s+zu\b/i,
  /\bdragon\s+raja\b/i,
  /\bsan\s+ti\b/i,
  /\bthree-?body\b/i,
]

const japaneseOriginStudioPatterns = [
  /\btoei\b/i,
  /\bmappa\b/i,
  /\bufotable\b/i,
  /\bkyoto\s+animation\b/i,
  /\ba-?1\s+pictures\b/i,
  /\bbones\b/i,
  /\bmadhouse\b/i,
  /\bwit\s+studio\b/i,
  /\bcloverworks\b/i,
  /\bpierrot\b/i,
  /\bproduction\s+i\.?g\b/i,
  /\bshaft\b/i,
  /\btrigger\b/i,
  /\bwhite\s+fox\b/i,
  /\bdoga\s+kobo\b/i,
  /\bp\.?a\.?\s*works\b/i,
  /\bscience\s+saru\b/i,
  /\btms\s+entertainment\b/i,
  /\bj\.?c\.?\s*staff\b/i,
  /\bsunrise\b/i,
  /\bstudio\s+deen\b/i,
  /\bsilver\s+link\b/i,
  /\bkinema\s+citrus\b/i,
  /\blidenfilms\b/i,
  /\bdavid\s+production\b/i,
  /\bsatelight\b/i,
]

const getOriginTitleText = (anime?: Pick<MalAnime, 'title' | 'alternative_titles'>) => {
  return [
    anime?.title,
    anime?.alternative_titles?.en,
    anime?.alternative_titles?.ja,
    ...(anime?.alternative_titles?.synonyms || []),
  ]
    .filter(Boolean)
    .join(' ')
}

const getOriginStudioText = (anime?: Pick<MalAnime, 'studios' | 'studio'>) => {
  return [...(anime?.studios || []), ...(anime?.studio ? [anime.studio] : [])]
    .map((studio) => studio.name)
    .filter(Boolean)
    .join(' ')
}

export const hasChineseOriginCue = (
  anime?: Pick<MalAnime, 'title' | 'alternative_titles' | 'studios' | 'studio'>,
): boolean => {
  const titleText = getOriginTitleText(anime)
  const studioText = getOriginStudioText(anime)

  return (
    chineseOriginStudioPatterns.some((pattern) => pattern.test(studioText)) ||
    chineseOriginTitlePatterns.some((pattern) => pattern.test(titleText))
  )
}

export const getJapaneseOriginPriority = (
  anime?: Pick<MalAnime, 'title' | 'alternative_titles' | 'studios' | 'studio'>,
): number => {
  if (!anime || hasChineseOriginCue(anime)) {
    return -1
  }

  const titleText = getOriginTitleText(anime)
  const studioText = getOriginStudioText(anime)
  let priority = 0

  if (japaneseKanaPattern.test(anime.alternative_titles?.ja || '')) {
    priority += 3
  }

  if (japaneseKanaPattern.test(titleText)) {
    priority += 1
  }

  if (japaneseOriginStudioPatterns.some((pattern) => pattern.test(studioText))) {
    priority += 2
  }

  return priority
}

export const toPercentScore = (mean?: number): number | undefined => {
  return mean ? Math.round(mean * 10) : undefined
}

export const toCoverImage = (anime?: MalAnime): MalCoverImage => ({
  extraLarge: anime?.main_picture?.large || anime?.main_picture?.medium || '',
  large: anime?.main_picture?.large || anime?.main_picture?.medium || '',
  medium: anime?.main_picture?.medium || anime?.main_picture?.large || '',
  color: '',
})

const studioList = (anime?: MalAnime): MalStudio[] => {
  if (anime?.studios?.length) {
    return anime.studios
  }

  if (anime?.studio) {
    return [anime.studio]
  }

  return []
}

const weekMilliseconds = 1000 * 60 * 60 * 24 * 7

const getFirstScheduledAiringAt = (anime?: MalAnime): number => {
  const startDate = anime?.start_date?.slice(0, 10)
  const startTime = anime?.broadcast?.start_time

  if (!startDate || !startTime || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{2}:\d{2}$/.test(startTime)) {
    return 0
  }

  const firstAiringAt = new Date(`${startDate}T${startTime}:00+09:00`).getTime()

  return Number.isFinite(firstAiringAt) ? firstAiringAt : 0
}

const estimateReleasedEpisodes = (anime?: MalAnime, currentTime = Date.now()): number => {
  if (!anime) return 0

  if (toStatus(anime.status) !== 'RELEASING' || !anime.start_date) {
    return 0
  }

  const startedAt = new Date(`${anime.start_date}T00:00:00+09:00`).getTime()

  if (!Number.isFinite(startedAt) || startedAt > currentTime) {
    return 0
  }

  const weeksSinceStart = Math.floor((currentTime - startedAt) / weekMilliseconds)

  return Math.max(1, weeksSinceStart + 1)
}

export const toNextAiringEpisode = (anime?: MalAnime, currentTime = Date.now()): MalNextAiringEpisode | undefined => {
  if (toStatus(anime?.status) !== 'RELEASING') {
    return undefined
  }

  const firstScheduledAiringAt = getFirstScheduledAiringAt(anime)

  if (firstScheduledAiringAt) {
    const releasedEpisodes =
      currentTime < firstScheduledAiringAt
        ? 0
        : Math.floor((currentTime - firstScheduledAiringAt) / weekMilliseconds) + 1

    if (anime?.num_episodes && releasedEpisodes >= anime.num_episodes) {
      return undefined
    }

    const nextAiringAt = firstScheduledAiringAt + releasedEpisodes * weekMilliseconds

    return {
      airingAt: Math.floor(nextAiringAt / 1000),
      episode: releasedEpisodes + 1,
      timeUntilAiring: Math.max(Math.floor((nextAiringAt - currentTime) / 1000), 0),
    }
  }

  const releasedEpisodes = estimateReleasedEpisodes(anime, currentTime)

  if (!releasedEpisodes) {
    return undefined
  }

  return {
    airingAt: 0,
    episode: releasedEpisodes + 1,
    timeUntilAiring: 0,
  }
}

type MappedRanking = {
  id: number
  rank: number
  type: string
  format?: string
  year?: number
  season?: string
  allTime: boolean
  context: string
}

export type MappedRelation = {
  id: number
  title: MalTitle
  coverImage: {
    large: string
    extraLarge?: string
    color?: string
  }
  format?: string
  status?: string
  averageScore?: number
  episodes?: number
  genres?: string[]
  season?: string
  seasonYear?: number
  startDate?: MalFuzzyDate
  relationType?: string
}

export const toMappedRelation = (anime?: MalAnime, relationType?: string): MappedRelation => ({
  id: anime?.id || 0,
  title: toTitleObject(anime),
  coverImage: {
    large: anime?.main_picture?.large || anime?.main_picture?.medium || '',
    extraLarge: anime?.main_picture?.large || anime?.main_picture?.medium || '',
    color: '',
  },
  format: toFormat(anime?.media_type),
  status: toStatus(anime?.status),
  averageScore: toPercentScore(anime?.mean),
  episodes: anime?.num_episodes || undefined,
  genres: toSafeGenres(anime?.genres),
  season: toSeason(anime?.start_season?.season),
  seasonYear: anime?.start_season?.year,
  startDate: toFuzzyDate(anime?.start_date),
  relationType: relationType?.toUpperCase(),
})

type MappedExternalLink = {
  id: number
  url?: string
  site: string
  type?: string
  language?: string
}

type MappedStreamingEpisode = {
  title?: string
  url?: string
  site?: string
  thumbnail?: string
}

type MappedRecommendation = {
  mediaRecommendation?: MappedRelation
}

type MappedTrailer = {
  id?: string
  site?: string
  thumbnail?: string
}

type MappedCharacter = {
  id: number
  role?: string
  name: {
    full?: string
    native?: string
    userPreferred?: string
  }
  image?: {
    large?: string
    medium?: string
  }
  voiceActor?: {
    id: number
    name: {
      full?: string
      native?: string
      userPreferred?: string
    }
    image?: {
      large?: string
      medium?: string
    }
    language?: string
  }
}

type MappedStaff = {
  id: number
  role?: string
  name: {
    full?: string
    native?: string
    userPreferred?: string
  }
  image?: {
    large?: string
    medium?: string
  }
  primaryOccupations?: string[]
}

export type MappedDetails = {
  id: number
  idMal: number
  title: MalTitle
  description: string
  startDate: MalFuzzyDate
  endDate: MalFuzzyDate
  format: string
  status?: string
  episodes?: number
  duration?: number
  season?: string
  seasonYear?: number
  countryOfOrigin?: string
  source?: string
  averageScore?: number
  meanScore?: number
  popularity?: number
  favourites?: number
  trending?: number
  genres: string[]
  synonyms: string[]
  bannerImage: string
  coverImage: MalCoverImage
  trailer?: MappedTrailer
  characters: {
    nodes: MappedCharacter[]
  }
  staff: {
    nodes: MappedStaff[]
  }
  nextAiringEpisode?: MalNextAiringEpisode
  rankings: MappedRanking[]
  externalLinks: MappedExternalLink[]
  streamingEpisodes: MappedStreamingEpisode[]
  studios: {
    nodes: MalStudio[]
  }
  relations: {
    nodes: MappedRelation[]
  }
  seasonRelations: {
    nodes: MappedRelation[]
  }
  recommendations: {
    nodes: MappedRecommendation[]
  }
}

export const toMappedDetails = (anime: MalAnime): MappedDetails => {
  const rankings: MappedRanking[] = []

  if (anime.rank) {
    rankings.push({
      id: anime.id * 10 + 1,
      rank: anime.rank,
      type: 'RATED',
      format: toFormat(anime.media_type),
      year: anime.start_season?.year,
      season: toSeason(anime.start_season?.season),
      allTime: true,
      context: 'Top Ranked',
    })
  }

  if (anime.popularity) {
    rankings.push({
      id: anime.id * 10 + 2,
      rank: anime.popularity,
      type: 'POPULAR',
      format: toFormat(anime.media_type),
      year: anime.start_season?.year,
      season: toSeason(anime.start_season?.season),
      allTime: true,
      context: 'Most Popular',
    })
  }

  const relations: MappedRelation[] = (anime.related_anime || [])
    .map((item) => toMappedRelation(item.node, item.relation_type))
    .filter((item) => item.id > 0)

  return {
    id: anime.id,
    idMal: anime.id,
    title: toTitleObject(anime),
    description: anime.synopsis || anime.background || '',
    startDate: toFuzzyDate(anime.start_date),
    endDate: toFuzzyDate(anime.end_date),
    format: toFormat(anime.media_type),
    status: toStatus(anime.status),
    episodes: anime.num_episodes || undefined,
    duration: anime.average_episode_duration ? Math.round(anime.average_episode_duration / 60) : undefined,
    season: toSeason(anime.start_season?.season),
    seasonYear: anime.start_season?.year,
    countryOfOrigin: undefined,
    source: toSource(anime.source),
    averageScore: toPercentScore(anime.mean),
    meanScore: toPercentScore(anime.mean),
    popularity: anime.num_list_users || anime.popularity,
    favourites: anime.num_favorites,
    trending: anime.rank,
    genres: toSafeGenres(anime.genres),
    synonyms: anime.alternative_titles?.synonyms || [],
    bannerImage: '',
    coverImage: toCoverImage(anime),
    trailer: undefined,
    characters: {
      nodes: [],
    },
    staff: {
      nodes: [],
    },
    nextAiringEpisode: toNextAiringEpisode(anime),
    rankings,
    externalLinks: [],
    streamingEpisodes: [],
    studios: {
      nodes: studioList(anime),
    },
    relations: {
      nodes: relations,
    },
    seasonRelations: {
      nodes: [],
    },
    recommendations: {
      nodes: [],
    },
  }
}

export const toCardResult = (anime: MalAnime): MalCardResult => ({
  id: anime.id,
  title: anime.alternative_titles?.en || anime.title || anime.alternative_titles?.ja || 'Untitled',
  romajiTitle: anime.title || anime.alternative_titles?.ja || anime.alternative_titles?.en || 'Untitled',
  type: toFormat(anime.media_type)?.replace(/_/g, ' ') || 'ANIME',
  status: toStatus(anime.status)?.replace(/_/g, ' ') || 'UNKNOWN',
  episodes: anime.num_episodes || 0,
  year: anime.start_season?.year || parseDatePart(anime.start_date, 0) || '',
  score: toPercentScore(anime.mean) || 0,
  genres: toSafeGenres(anime.genres),
  image: anime.main_picture?.large || anime.main_picture?.medium || '',
})

export const formatDisplayDate = (value?: string): string => {
  if (!value) return ''

  const date = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export const createScheduleTimestamp = (dayOfWeek?: string, startTime?: string): number => {
  if (!dayOfWeek || !startTime) {
    return 0
  }

  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  const targetDay = dayMap[dayOfWeek.toLowerCase()]

  if (targetDay === undefined) {
    return 0
  }

  const [hoursText, minutesText] = startTime.split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText)

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return 0
  }

  const now = new Date()
  const utcNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const currentDay = utcNow.getDay()
  const dayOffset = (targetDay - currentDay + 7) % 7
  const nextDate = new Date(utcNow)
  nextDate.setHours(hours, minutes, 0, 0)
  nextDate.setDate(utcNow.getDate() + dayOffset)

  if (nextDate.getTime() <= utcNow.getTime()) {
    nextDate.setDate(nextDate.getDate() + 7)
  }

  const utcEquivalent = Date.UTC(
    nextDate.getFullYear(),
    nextDate.getMonth(),
    nextDate.getDate(),
    nextDate.getHours() - 9,
    nextDate.getMinutes(),
    0,
  )

  return Math.floor(utcEquivalent / 1000)
}

export const collectMalResults = async (
  loader: (offset: number, limit: number) => Promise<MalListResponse>,
  options: {
    page: number
    perPage: number
    batchSize?: number
    maxBatches?: number
    predicate?: (anime: MalAnime) => boolean
    dedupeById?: boolean
  },
): Promise<{ items: MalAnime[]; pageInfo: MalPageInfo }> => {
  const { page, perPage, batchSize = 50, maxBatches = 5, predicate, dedupeById = true } = options
  const targetCount = page * perPage
  const all: MalAnime[] = []
  const seenIds = new Set<number>()
  let next = true
  let batches = 0
  let offset = 0

  while (next && batches < maxBatches && all.length < targetCount + perPage) {
    const response = await loader(offset, batchSize)
    const items = parseMalList(response)
    next = hasNextPage(response)
    offset += batchSize
    batches += 1

    for (const anime of items) {
      if (dedupeById && seenIds.has(anime.id)) {
        continue
      }

      if (predicate && !predicate(anime)) {
        continue
      }

      seenIds.add(anime.id)
      all.push(anime)
    }
  }

  const start = Math.max(0, (page - 1) * perPage)
  const pageItems = all.slice(start, start + perPage)

  return {
    items: pageItems,
    pageInfo: buildPageInfo(page, perPage, all.length > start + perPage || next, all.length),
  }
}
