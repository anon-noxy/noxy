<script setup lang="ts">
import type { EpisodeReaction } from '~/stores/userPreferences'
import { isSupportedAnimeGenre } from '#shared/animeGenres'

type AnimeDetails = {
  id: number
  title?: {
    english?: string
    native?: string
    userPreferred?: string
    romaji?: string
  }
  description?: string
  startDate?: {
    year?: number
    month?: number
    day?: number
  }
  endDate?: {
    year?: number
    month?: number
    day?: number
  }
  format?: string
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
  genres?: string[]
  bannerImage?: string
  nextAiringEpisode?: {
    airingAt: number
    episode: number
    timeUntilAiring: number
  }
  streamingEpisodes?: Array<{
    title?: string
    url?: string
    site?: string
    thumbnail?: string
  }>
  coverImage?: {
    extraLarge?: string
    large?: string
    medium?: string
    color?: string
  }
  studios?: {
    nodes?: Array<{ id: number; name: string }>
  }
  relations?: {
    nodes?: RelatedAnime[]
  }
  seasonRelations?: {
    nodes?: RelatedAnime[]
  }
  recommendations?: {
    nodes?: Array<{ mediaRecommendation?: RelatedAnime }>
  }
}

type RelatedAnime = {
  id: number
  title?: {
    english?: string
    native?: string
    userPreferred?: string
    romaji?: string
  }
  coverImage?: {
    extraLarge?: string
    large?: string
    color?: string
  }
  format?: string
  status?: string
  averageScore?: number
  episodes?: number
  season?: string
  seasonYear?: number
  startDate?: {
    year?: number
    month?: number
    day?: number
  }
  relationType?: string
  genres?: string[]
}

type TrendingAnime = {
  id: number
  title: string
  romajiTitle: string
  image: string
  color?: string
}

type PlayerMessage = {
  channel?: string
  event?: string
  type?: string
  time?: number
  currentTime?: number
  duration?: number
  percent?: number
}

type WatchEntry = {
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
}

type WatchDetailRow = [string, string | string[]]

const watchedProgressThreshold = 60
const episodeGridThreshold = 35

const route = useRoute()
const id = computed(() => String(route.params.id))
const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))
const userPreferences = useUserPreferencesStore()
const { continueWatching, shouldAdvanceAfterMarkWatched, watchedEpisodes } = storeToRefs(userPreferences)
const { getAnimeTitle } = useAnimeTitle(selectedLanguage)
const { cleanAnimeDescription, formatAnimeDisplayDate, formatAnimeText } = useAnimeFormatters()
const { excludeSeasonCollectionItems } = useAnimeRelationFilters()
const { isAnimeSaved, toggleAnimeSaved } = useAnimeWatchlist()
const animeDetailsRefreshIntervalMs = 60 * 1000
const episode = computed(() => {
  const value = Number(route.query.episode || 1)
  return Number.isInteger(value) && value > 0 ? value : 1
})
const language = computed(() => (route.query.language === 'dub' ? 'dub' : 'sub'))

const {
  data: anime,
  pending,
  error,
  refresh: refreshAnimeDetails,
} = await useFetch<AnimeDetails>(() => `/api/myanimelist/${id.value}`, {
  key: () => `watch-mal-${id.value}-details-v2`,
  getCachedData: (key, nuxtApp) => (nuxtApp.isHydrating ? nuxtApp.payload.data[key] : undefined),
  watch: [id],
})

const { data: trendingData } = await useFetch<TrendingAnime[]>('/api/myanimelist/trending', {
  key: 'watch-trending-anime-v1',
  default: () => [],
})

const formatText = (value?: string) => formatAnimeText(value, '')
const formatDate = (date?: { year?: number; month?: number; day?: number }) => formatAnimeDisplayDate(date)
const getTitle = () => getAnimeTitle(anime.value?.title, `Anime ${id.value}`)
const getRelatedTitle = (mediaTitle?: RelatedAnime['title']) => getAnimeTitle(mediaTitle, 'Anime')
const blockedRelatedFormats = new Set(['MUSIC', 'CM', 'ONA', 'GENRE'])
const currentTimestamp = ref(Date.now())
const localTimezone = ref('Local time')
let animeDetailsRefreshTimer: ReturnType<typeof setInterval> | undefined
let scheduleClockTimer: ReturnType<typeof setInterval> | undefined

const shouldRefreshCurrentEpisodes = () => {
  return anime.value?.status === 'RELEASING' || Boolean(anime.value?.nextAiringEpisode)
}

const refreshCurrentEpisodes = () => {
  if (!shouldRefreshCurrentEpisodes()) return

  void refreshAnimeDetails({ dedupe: 'cancel' })
}

onMounted(() => {
  currentTimestamp.value = Date.now()
  localTimezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'
  refreshCurrentEpisodes()
  animeDetailsRefreshTimer = setInterval(refreshCurrentEpisodes, animeDetailsRefreshIntervalMs)
  scheduleClockTimer = setInterval(() => {
    currentTimestamp.value = Date.now()
  }, 30_000)
})

onUnmounted(() => {
  if (animeDetailsRefreshTimer) {
    clearInterval(animeDetailsRefreshTimer)
  }

  if (scheduleClockTimer) {
    clearInterval(scheduleClockTimer)
  }
})

const isAllowedRelatedAnime = (item?: RelatedAnime) => {
  const format = item?.format?.toUpperCase()
  const relationType = item?.relationType?.toUpperCase()

  return (
    Boolean(item?.id) &&
    item?.id !== anime.value?.id &&
    !blockedRelatedFormats.has(format || '') &&
    !blockedRelatedFormats.has(relationType || '')
  )
}

const isAllowedSeasonAnime = (item?: RelatedAnime) => {
  const format = item?.format?.toUpperCase()
  const relationType = item?.relationType?.toUpperCase()
  const hasBlockedFormat = blockedRelatedFormats.has(format || '') && format !== 'ONA'

  return Boolean(item?.id) && !hasBlockedFormat && relationType !== 'MUSIC'
}

const getSeasonTitleText = (item?: RelatedAnime) => {
  return [item?.title?.english, item?.title?.userPreferred, item?.title?.romaji, item?.title?.native]
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

const isMainSeasonAnime = (item?: RelatedAnime) => {
  if (!isAllowedSeasonAnime(item)) {
    return false
  }

  const titleText = getSeasonTitleText(item)
  const hasMainCue = hasMainSeasonCue(titleText)

  if (hasSideStoryCue(titleText) && !hasMainCue) {
    return false
  }

  const format = item?.format?.toUpperCase()

  if (format === 'TV' || format === 'TV_SHORT') {
    return true
  }

  if (hasMainCue) {
    return true
  }

  return format === 'ONA' && (item?.episodes || 0) >= 4
}

const title = computed(() => {
  return getTitle()
})

const englishTitle = computed(() => {
  return anime.value?.title?.english || anime.value?.title?.userPreferred || anime.value?.title?.romaji || title.value
})

const romajiTitle = computed(() => {
  return anime.value?.title?.romaji || anime.value?.title?.userPreferred || anime.value?.title?.english || title.value
})

const cleanDescription = computed(() => {
  return cleanAnimeDescription(anime.value?.description)
})

const visibleAnimeGenres = computed(() => {
  return anime.value?.genres?.filter(isSupportedAnimeGenre) || []
})

const watchDetails = computed<WatchDetailRow[]>(() => {
  const media = anime.value
  const airedDate = media?.startDate?.year
    ? `${formatDate(media.startDate)}${media.endDate?.year ? ` to ${formatDate(media.endDate)}` : ' to ?'}`
    : ''

  const rows: WatchDetailRow[] = [
    ['Type', formatText(media?.format)],
    ['Date aired', airedDate],
    ['Status', formatText(media?.status)],
    ['Genres', visibleAnimeGenres.value.slice(0, 7)],
    ['Country', media?.countryOfOrigin || ''],
    ['Scores', media?.averageScore ? `${media.averageScore}%` : '?'],
    ['Premiered', media?.season && media.seasonYear ? `${formatText(media.season)} ${media.seasonYear}` : ''],
    ['Duration', media?.duration ? `${media.duration}m` : ''],
    ['Episodes', media?.episodes ? String(media.episodes) : '?'],
    ['Studios', media?.studios?.nodes?.map((studio) => studio.name).join(', ') || ''],
  ]

  return rows.filter(([, value]) => (Array.isArray(value) ? value.length : value))
})

const watchInformationDetails = computed(() => {
  return watchDetails.value.filter(([label]) => !['Genres', 'Scores', 'Duration', 'Episodes'].includes(label))
})

const mediaMeta = computed(() => {
  const media = anime.value

  return [
    media?.format ? formatText(media.format) : '',
    media?.startDate?.year ? formatDate(media.startDate) : '',
    media?.duration ? `${media.duration}m` : '',
  ].filter(Boolean)
})

const currentSeasonItem = computed<RelatedAnime | undefined>(() => {
  const media = anime.value

  if (!media) return undefined

  return {
    id: media.id,
    title: media.title,
    coverImage: media.coverImage,
    format: media.format,
    status: media.status,
    averageScore: media.averageScore,
    episodes: media.episodes,
    season: media.season,
    seasonYear: media.seasonYear,
    startDate: media.startDate,
    relationType: 'CURRENT',
    genres: media.genres,
  }
})

const recommendationItems = computed(() => {
  return (
    anime.value?.recommendations?.nodes
      ?.map((item) => item.mediaRecommendation)
      .filter((item): item is RelatedAnime => Boolean(item) && isAllowedRelatedAnime(item))
      .slice(0, 10) || []
  )
})

const trendingAnimes = computed(() => {
  return (trendingData.value || []).filter((item) => item.id !== anime.value?.id).slice(0, 8)
})

const shouldShowTrendingAnimes = computed(() => {
  return recommendationItems.value.length > 0 && trendingAnimes.value.length > 0
})

const getSeasonDateKey = (item: RelatedAnime) => {
  const year = item.startDate?.year || item.seasonYear || 0
  const month = item.startDate?.month || 0
  const day = item.startDate?.day || 0

  return year * 10000 + month * 100 + day
}

const compareSeasonItems = (first: RelatedAnime, second: RelatedAnime) => {
  const dateDiff = getSeasonDateKey(first) - getSeasonDateKey(second)

  return dateDiff || first.id - second.id
}

const directMoreSeasonItems = computed(() => {
  const currentSeason = currentSeasonItem.value

  if (!currentSeason) return []

  const timelineRelations = [...(anime.value?.relations?.nodes || [])].filter(
    (item) =>
      isMainSeasonAnime(item) &&
      (item.relationType === 'PREQUEL' || item.relationType === 'SEQUEL') &&
      item.id !== currentSeason.id,
  )

  if (!timelineRelations.length) return []

  const currentSeasonItems = isMainSeasonAnime(currentSeason) ? [currentSeason] : []

  return [
    ...timelineRelations.filter((item) => item.relationType === 'PREQUEL').sort(compareSeasonItems),
    ...currentSeasonItems,
    ...timelineRelations.filter((item) => item.relationType === 'SEQUEL').sort(compareSeasonItems),
  ]
})

const moreSeasonItems = computed(() => {
  const seenIds = new Set<number>()
  const apiSeasonItems =
    anime.value?.seasonRelations?.nodes?.filter(isMainSeasonAnime).filter((item) => {
      if (seenIds.has(item.id)) {
        return false
      }

      seenIds.add(item.id)
      return true
    }) || []

  if (apiSeasonItems.length > 1) {
    return apiSeasonItems
  }

  return directMoreSeasonItems.value
})

const relatedAnimeItems = computed(() => {
  const allowedItems = [...(anime.value?.relations?.nodes || [])].filter(isAllowedRelatedAnime)

  return excludeSeasonCollectionItems(allowedItems, moreSeasonItems.value).slice(0, 1)
})

const shouldShowSideAnimeRail = computed(() => {
  return relatedAnimeItems.value.length > 0 || shouldShowTrendingAnimes.value
})

const relatedCardFormat = (item: RelatedAnime) => (item.format ? formatText(item.format) : '')

const relatedCardDate = (item: RelatedAnime) => {
  return item.startDate?.year ? formatDate(item.startDate) : item.seasonYear ? String(item.seasonYear) : ''
}

const normalizeSeasonPart = (value?: string) => {
  return (value || '')
    .replace(/\b(part|cour)\b/gi, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .replace(/\s+/g, ' ')
    .trim()
}

const seasonLabelFromTitle = (value?: string) => {
  const titleValue = value?.trim()

  if (!titleValue) return ''

  const seasonPartMatch = titleValue.match(/season\s*(\d+)\s*(?::|-)?\s*((?:part|cour)\s*\d+(?:\s*\([^)]+\))?)/i)

  if (seasonPartMatch?.[1]) {
    return `Season ${Number(seasonPartMatch[1])}: ${normalizeSeasonPart(seasonPartMatch[2])}`
  }

  const ordinalSeasonMatch = titleValue.match(
    /(\d+)(?:st|nd|rd|th)\s+season\s*(?::|-)?\s*((?:part|cour)\s*\d+(?:\s*\([^)]+\))?)/i,
  )

  if (ordinalSeasonMatch?.[1]) {
    const seasonPart = normalizeSeasonPart(ordinalSeasonMatch[2])

    return `Season ${Number(ordinalSeasonMatch[1])}${seasonPart ? `: ${seasonPart}` : ''}`
  }

  const simpleSeasonMatch = titleValue.match(/season\s*(\d+)/i)

  if (simpleSeasonMatch?.[1]) {
    return `Season ${Number(simpleSeasonMatch[1])}`
  }

  const finalSeasonMatch = titleValue.match(/final\s+season(?:\s*(?::|-)?\s*((?:part|cour)\s*\d+(?:\s*\([^)]+\))?))?/i)

  if (finalSeasonMatch) {
    const seasonPart = normalizeSeasonPart(finalSeasonMatch[1])

    return `Final Season${seasonPart ? `: ${seasonPart}` : ''}`
  }

  return ''
}

const getMoreSeasonLabel = (item: RelatedAnime, index: number) => {
  const label =
    seasonLabelFromTitle(item.title?.english) ||
    seasonLabelFromTitle(item.title?.userPreferred) ||
    seasonLabelFromTitle(item.title?.romaji) ||
    seasonLabelFromTitle(item.title?.native)

  return label || `Season ${index + 1}`
}

const getMoreSeasonImage = (item: RelatedAnime) => {
  return item.coverImage?.extraLarge || item.coverImage?.large || ''
}

const getMoreSeasonMeta = (item: RelatedAnime) => {
  return [
    item.format ? formatText(item.format) : '',
    item.seasonYear ? String(item.seasonYear) : '',
    item.episodes ? `${item.episodes} episodes` : '',
  ]
    .filter(Boolean)
    .join(' • ')
}

const getMoreSeasonLink = (item: RelatedAnime) => {
  if (item.id === anime.value?.id) {
    return `/watch/${id.value}?episode=${activeEpisode.value}&language=${language.value}`
  }

  return `/watch/${item.id}?episode=1&language=${language.value}`
}

const getTrendingTitle = (item: TrendingAnime) => {
  return selectedLanguage.value === 'EN' ? item.title : item.romajiTitle
}

const getRelatedImage = (item: RelatedAnime) => {
  return item.coverImage?.large || item.coverImage?.extraLarge || ''
}

const toggleRelatedSaved = (item: RelatedAnime) => {
  toggleAnimeSaved({
    id: item.id,
    title: getRelatedTitle(item.title),
    image: getRelatedImage(item),
  })
}

const toggleTrendingSaved = (item: TrendingAnime) => {
  toggleAnimeSaved({
    id: item.id,
    title: getTrendingTitle(item),
    image: item.image,
  })
}

const episodeSearch = ref('')
const episodeSearchInput = ref<HTMLInputElement | null>(null)
const watchPlayerColumn = ref<HTMLElement | null>(null)
const activeSidebarIndex = ref(-1)
const selectedEpisodeRangeIndex = ref(0)
const isEpisodeRangeOpen = ref(false)
const playerUnavailableMessage = 'The selected stream did not respond.'
const playerHealthDelayMs = 5000
const progress = ref(0)
const currentTime = ref(0)
const duration = ref(0)
const playerHealthNotice = ref('')
const hasPlayerActivity = ref(false)
const playerReloadKey = ref(0)
const isLightOff = ref(false)
const isAutoNextEnabled = ref(true)
let lastProgressPersistedAt = 0
const autoMarkedWatchedEpisodeKeys = new Set<string>()
const watchLayoutHeight = ref(0)
const isWideWatchLayout = useMediaQuery('(min-width: 1280px)')

const watchLayoutStyle = computed(() => {
  return watchLayoutHeight.value ? { '--watch-layout-height': `${watchLayoutHeight.value}px` } : undefined
})

const watchColumnStyle = computed(() => {
  return isWideWatchLayout.value && watchLayoutHeight.value
    ? {
        height: `${watchLayoutHeight.value}px`,
        maxHeight: `${watchLayoutHeight.value}px`,
      }
    : undefined
})

const updateWatchLayoutHeight = () => {
  watchLayoutHeight.value = watchPlayerColumn.value?.offsetHeight || 0
}

useResizeObserver(watchPlayerColumn, updateWatchLayoutHeight)

const releasedEpisodeNumbers = computed(() => {
  return getAvailableEpisodeNumbers(anime.value)
})

const hasListedStreamingEpisodes = computed(() => {
  return Boolean(anime.value?.streamingEpisodes?.some((item) => item.url))
})

const nextScheduledEpisode = computed(() => {
  if (anime.value?.status !== 'RELEASING') {
    return undefined
  }

  return anime.value.nextAiringEpisode
})

const episodeNumbers = computed(() => {
  const episodes = [...releasedEpisodeNumbers.value]
  const nextEpisodeNumber = nextScheduledEpisode.value?.episode || 0
  const totalEpisodes = anime.value?.episodes || 0
  const canShowScheduledEpisode =
    !hasListedStreamingEpisodes.value && nextEpisodeNumber > 0 && (!totalEpisodes || nextEpisodeNumber <= totalEpisodes)

  if (canShowScheduledEpisode && !episodes.includes(nextEpisodeNumber)) {
    episodes.push(nextEpisodeNumber)
  }

  return episodes.sort((left, right) => left - right)
})

const episodeRangeOptions = computed(() => {
  const ranges: Array<{ index: number; label: string; episodes: number[] }> = []

  for (let index = 0; index < episodeNumbers.value.length; index += 100) {
    const episodes = episodeNumbers.value.slice(index, index + 100)
    const firstEpisode = episodes[0]
    const lastEpisode = episodes.at(-1)

    if (!firstEpisode || !lastEpisode) continue

    ranges.push({
      index: ranges.length,
      label: `${String(firstEpisode).padStart(3, '0')}-${String(lastEpisode).padStart(3, '0')}`,
      episodes,
    })
  }

  return ranges
})

const selectedEpisodeRange = computed(() => {
  return episodeRangeOptions.value[selectedEpisodeRangeIndex.value] || episodeRangeOptions.value[0]
})

const getEpisodeRangeWatchedCount = (episodes: number[]) => {
  return episodes.filter(
    (episodeNumber) =>
      isEpisodeWatched(episodeNumber) || (getEpisodeProgress(episodeNumber)?.progress || 0) >= watchedProgressThreshold,
  ).length
}

const activeEpisode = computed(() => {
  if (!episodeNumbers.value.length || episodeNumbers.value.includes(episode.value)) {
    return episode.value
  }

  return episodeNumbers.value.filter((item) => item < episode.value).at(-1) ?? episodeNumbers.value[0] ?? episode.value
})

const isEpisodeUnaired = (episodeNumber: number) => {
  const nextEpisode = nextScheduledEpisode.value

  if (!nextEpisode?.episode || episodeNumber < nextEpisode.episode) {
    return false
  }

  if (episodeNumber > nextEpisode.episode) {
    return true
  }

  return !nextEpisode.airingAt || nextEpisode.airingAt * 1000 > currentTimestamp.value
}

const isActiveEpisodeUnaired = computed(() => isEpisodeUnaired(activeEpisode.value))

const activeEpisodeAiringAt = computed(() => {
  const nextEpisode = nextScheduledEpisode.value

  if (!nextEpisode?.airingAt || nextEpisode.episode !== activeEpisode.value) {
    return 0
  }

  return nextEpisode.airingAt
})

const activeEpisodeAiringLabel = computed(() => {
  if (!activeEpisodeAiringAt.value) {
    return ''
  }

  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(activeEpisodeAiringAt.value * 1000))
})

const activeEpisodeCountdown = computed(() => {
  if (!activeEpisodeAiringAt.value) {
    return 'Schedule time pending'
  }

  const remainingSeconds = Math.max(Math.ceil((activeEpisodeAiringAt.value * 1000 - currentTimestamp.value) / 1000), 0)

  if (!remainingSeconds) {
    return 'Airing now'
  }

  const days = Math.floor(remainingSeconds / 86_400)
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600)
  const minutes = Math.max(Math.ceil((remainingSeconds % 3_600) / 60), 1)

  if (days) {
    return `${days}d ${hours}h remaining`
  }

  if (hours) {
    return `${hours}h ${minutes}m remaining`
  }

  return `${minutes}m remaining`
})

const parseStreamingEpisodeNumber = (value?: string) => {
  if (!value) return 0

  const match = value.match(/(?:episode|ep\.?|#)\s*0*(\d+)/i)
  const episodeNumber = Number(match?.[1] || 0)

  return Number.isInteger(episodeNumber) && episodeNumber > 0 ? episodeNumber : 0
}

const episodeTitlePrefixes = computed(() => {
  const titles = [title.value, englishTitle.value, romajiTitle.value, anime.value?.title?.native]
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))

  return Array.from(new Set(titles.map((item) => item.toLowerCase()))).map(
    (normalizedTitle) => titles.find((item) => item.toLowerCase() === normalizedTitle) as string,
  )
})

const stripAnimeTitlePrefix = (value: string) => {
  const normalizedValue = value.toLowerCase()
  const prefix = episodeTitlePrefixes.value.find(
    (item) => item.length > 3 && normalizedValue.startsWith(item.toLowerCase()),
  )

  if (!prefix) return value

  return value
    .slice(prefix.length)
    .replace(/^[\s:._\-–—]+/, '')
    .trim()
}

const cleanEpisodeTitle = (value: string | undefined, episodeNumber: number) => {
  const titleValue = stripAnimeTitlePrefix((value || '').replace(/\s+/g, ' ').trim())

  if (!titleValue) return ''

  const episodePrefixPattern = new RegExp(`^(?:episode|ep\\.?|#)\\s*0*${episodeNumber}\\s*(?:[:._\\-–—]\\s*)?`, 'i')
  const episodeOnlyPattern = new RegExp(`^(?:episode|ep\\.?|#)\\s*0*${episodeNumber}$`, 'i')
  const cleanedTitle = titleValue.replace(episodePrefixPattern, '').trim()

  if (cleanedTitle && cleanedTitle !== titleValue) {
    return cleanedTitle
  }

  return episodeOnlyPattern.test(titleValue) ? '' : titleValue
}

const episodeTitleByNumber = computed(() => {
  const titles = new Map<number, string>()

  anime.value?.streamingEpisodes?.forEach((item) => {
    const episodeNumber = parseStreamingEpisodeNumber(item.title)

    if (!episodeNumber || titles.has(episodeNumber)) return

    const episodeTitle = cleanEpisodeTitle(item.title, episodeNumber)

    if (episodeTitle) {
      titles.set(episodeNumber, episodeTitle)
    }
  })

  return titles
})

const getEpisodeListTitle = (episodeNumber: number) => {
  return episodeTitleByNumber.value.get(episodeNumber) || `Episode ${episodeNumber}`
}

const playerSrc = computed(() => {
  return `https://megaplay.buzz/stream/mal/${id.value}/${activeEpisode.value}/${language.value}`
})

const playerFrameKey = computed(() => `${playerSrc.value}-${playerReloadKey.value}`)

const playerShieldImage = computed(() => {
  return (
    anime.value?.bannerImage ||
    anime.value?.coverImage?.extraLarge ||
    anime.value?.coverImage?.large ||
    anime.value?.coverImage?.medium ||
    ''
  )
})

const watchlistImage = computed(() => {
  return anime.value?.coverImage?.large || anime.value?.coverImage?.extraLarge || anime.value?.coverImage?.medium || ''
})

const isSaved = computed(() => {
  return isAnimeSaved(anime.value?.id)
})

const visibleEpisodes = computed(() => {
  const query = episodeSearch.value.trim()
  const rangeEpisodes = selectedEpisodeRange.value?.episodes || episodeNumbers.value

  if (!query) {
    return rangeEpisodes
  }

  return rangeEpisodes.filter((item) => String(item).includes(query))
})

const shouldUseEpisodeGrid = computed(() => episodeNumbers.value.length > episodeGridThreshold)

const episodeProgressByNumber = computed(() => {
  const progressByNumber = new Map<number, { currentTime: number; duration: number; progress: number }>()

  continueWatching.value
    .filter((entry) => entry.id === anime.value?.id && entry.language === language.value)
    .forEach((entry) => {
      progressByNumber.set(entry.episode, {
        currentTime: entry.currentTime || 0,
        duration: entry.duration || 0,
        progress: entry.progress || 0,
      })
    })

  return progressByNumber
})

const watchedEpisodesForAnime = computed(() => {
  return new Set(
    watchedEpisodes.value
      .filter((entry) => entry.id === anime.value?.id && entry.language === language.value)
      .map((entry) => entry.episode),
  )
})

const getEpisodeProgress = (episodeNumber: number) => {
  return episodeProgressByNumber.value.get(episodeNumber)
}

const isEpisodeWatched = (episodeNumber: number) => {
  return watchedEpisodesForAnime.value.has(episodeNumber)
}

const isEpisodeComplete = (episodeNumber: number) => {
  return (
    isEpisodeWatched(episodeNumber) || (getEpisodeProgress(episodeNumber)?.progress || 0) >= watchedProgressThreshold
  )
}

const getEpisodeGridItemClass = (episodeNumber: number, itemIndex: number) => {
  if (isEpisodeUnaired(episodeNumber)) {
    return episodeNumber === activeEpisode.value
      ? 'bg-amber-200 text-black ring-1 ring-amber-100/70 hover:bg-amber-100'
      : 'bg-amber-200/12 text-amber-100 ring-1 ring-amber-200/20 hover:bg-amber-200/18'
  }

  if (episodeNumber === activeEpisode.value) {
    return 'bg-pink-300 text-black hover:bg-pink-200'
  }

  if (itemIndex === activeSidebarIndex.value) {
    return 'bg-[#302d4a] text-pink-200 ring-1 ring-pink-300/60 hover:bg-[#35304f]'
  }

  if (isEpisodeComplete(episodeNumber)) {
    return 'bg-emerald-300/15 text-emerald-200 hover:bg-emerald-300/20'
  }

  if (getEpisodeProgress(episodeNumber)?.progress) {
    return 'bg-amber-300/20 text-amber-100 hover:bg-amber-300/25'
  }

  return 'bg-[#363743] text-[var(--color-heading)]/70 hover:bg-[#424452] hover:text-pink-200'
}

const getEpisodeListItemClass = (episodeNumber: number, itemIndex: number) => {
  if (isEpisodeUnaired(episodeNumber)) {
    return episodeNumber === activeEpisode.value
      ? 'border-l-4 border-amber-200 bg-amber-200/12 text-amber-100'
      : 'border-l-4 border-amber-200/60 bg-amber-200/6 text-amber-100/80'
  }

  if (episodeNumber === activeEpisode.value) {
    return 'border-l-4 border-pink-300 bg-[#302d4a] text-pink-300'
  }

  if (itemIndex === activeSidebarIndex.value) {
    return 'border-l-4 border-pink-300/60 bg-[#24233a] text-pink-200'
  }

  return itemIndex % 2
    ? 'border-l-4 border-transparent bg-[#211f33] text-[var(--color-text)]'
    : 'border-l-4 border-transparent bg-[#29273b] text-[var(--color-text)]'
}

const getEpisodeProgressLabel = (episodeNumber: number) => {
  if (isEpisodeWatched(episodeNumber)) {
    return 'Watched'
  }

  const episodeProgress = getEpisodeProgress(episodeNumber)

  if (!episodeProgress?.progress) {
    return ''
  }

  return episodeProgress.progress >= watchedProgressThreshold ? 'Watched' : `${episodeProgress.progress}%`
}

const activeEpisodeProgress = computed(() => {
  return getEpisodeProgress(activeEpisode.value)
})

const activeEpisodeCompletionProgress = computed(() => {
  return Math.max(activeEpisodeProgress.value?.progress || 0, progress.value || 0)
})

const getActiveEpisodeWatchedKey = () => {
  if (!anime.value || !activeEpisode.value) return ''

  return `${anime.value.id}:${activeEpisode.value}:${language.value}`
}

const activeEpisodeWatched = computed(() => {
  if (isActiveEpisodeUnaired.value) {
    return false
  }

  const watchedKey = getActiveEpisodeWatchedKey()

  return (
    isEpisodeWatched(activeEpisode.value) ||
    (activeEpisodeCompletionProgress.value >= watchedProgressThreshold &&
      Boolean(watchedKey) &&
      !autoMarkedWatchedEpisodeKeys.has(watchedKey))
  )
})

const activeEpisodeReaction = computed(() => {
  if (!anime.value) return undefined

  return userPreferences.getEpisodeReaction(anime.value.id, activeEpisode.value, language.value)?.reaction
})

const shouldShowEpisodeReaction = computed(() => {
  return !isActiveEpisodeUnaired.value && (activeEpisodeWatched.value || Boolean(activeEpisodeReaction.value))
})

const toggleActiveEpisodeReaction = (reaction: EpisodeReaction) => {
  if (!anime.value || isActiveEpisodeUnaired.value) return

  const isClearingReaction = activeEpisodeReaction.value === reaction

  userPreferences.updateEpisodeReaction({
    id: anime.value.id,
    title: title.value,
    image: watchlistImage.value,
    episode: activeEpisode.value,
    language: language.value,
    reaction: isClearingReaction ? null : reaction,
  })
  userPreferences.pushToast(isClearingReaction ? 'Episode reaction cleared' : 'Episode reaction saved', 'success')
}

const markActiveEpisodeWatched = () => {
  if (!anime.value || !activeEpisode.value || isActiveEpisodeUnaired.value || isEpisodeWatched(activeEpisode.value)) {
    return false
  }

  userPreferences.markEpisodeWatched({
    id: anime.value.id,
    title: title.value,
    image: watchlistImage.value,
    episode: activeEpisode.value,
    language: language.value,
  })

  return true
}

const autoMarkActiveEpisodeWatched = () => {
  if (
    !import.meta.client ||
    isActiveEpisodeUnaired.value ||
    activeEpisodeCompletionProgress.value < watchedProgressThreshold
  ) {
    return
  }

  const watchedKey = getActiveEpisodeWatchedKey()

  if (!watchedKey || autoMarkedWatchedEpisodeKeys.has(watchedKey) || isEpisodeWatched(activeEpisode.value)) return

  if (markActiveEpisodeWatched()) {
    autoMarkedWatchedEpisodeKeys.add(watchedKey)
    userPreferences.pushToast('Episode marked watched', 'success')
  }
}

const toggleActiveEpisodeWatched = () => {
  if (!anime.value || !activeEpisode.value || isActiveEpisodeUnaired.value) return

  const didMarkWatched = userPreferences.toggleEpisodeWatched({
    id: anime.value.id,
    title: title.value,
    image: watchlistImage.value,
    episode: activeEpisode.value,
    language: language.value,
  })

  userPreferences.pushToast(
    didMarkWatched
      ? `Episode ${activeEpisode.value} marked watched`
      : `Episode ${activeEpisode.value} marked unwatched`,
    didMarkWatched ? 'success' : 'info',
  )

  if (didMarkWatched && shouldAdvanceAfterMarkWatched.value && nextPlayableEpisodeTo.value) {
    navigateTo(nextPlayableEpisodeTo.value)
  }

  if (!didMarkWatched) {
    const watchedKey = getActiveEpisodeWatchedKey()

    if (watchedKey) {
      autoMarkedWatchedEpisodeKeys.add(watchedKey)
    }
  }
}

const selectEpisodeRange = (rangeIndex: number) => {
  selectedEpisodeRangeIndex.value = rangeIndex
  isEpisodeRangeOpen.value = false
}

const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null

  return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'))
}

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return

  if (event.key === '/') {
    if (isTypingTarget(event.target)) return

    event.preventDefault()
    episodeSearchInput.value?.focus()
    return
  }

  if (isTypingTarget(event.target)) return
}

const focusActiveSidebarEpisode = () => {
  const currentIndex = visibleEpisodes.value.findIndex((item) => item === activeEpisode.value)

  activeSidebarIndex.value = currentIndex >= 0 ? currentIndex : 0
}

const handleEpisodeSearchKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return

  if (!visibleEpisodes.value.length) return

  if (event.key === 'Enter') {
    const episodeNumber = visibleEpisodes.value[Math.max(activeSidebarIndex.value, 0)]

    if (episodeNumber) {
      event.preventDefault()
      navigateTo(`/watch/${id.value}?episode=${episodeNumber}&language=${language.value}`)
    }

    return
  }

  event.preventDefault()

  const direction = event.key === 'ArrowDown' ? 1 : -1
  activeSidebarIndex.value =
    (activeSidebarIndex.value + direction + visibleEpisodes.value.length) % visibleEpisodes.value.length
}

const persistActiveProgress = (force = false) => {
  if (!import.meta.client || !anime.value || !activeEpisode.value) return

  const now = Date.now()

  if (!force && now - lastProgressPersistedAt < 5000) {
    return
  }

  lastProgressPersistedAt = now

  userPreferences.updateContinueWatchingProgress(
    anime.value.id,
    activeEpisode.value,
    language.value,
    currentTime.value,
    duration.value,
    progress.value,
  )
}

const { start: startPlayerHealthTimeout, stop: clearPlayerHealthTimeout } = useTimeoutFn(
  () => {
    if (!hasPlayerActivity.value && !isActiveEpisodeUnaired.value) {
      playerHealthNotice.value = playerUnavailableMessage
    }
  },
  playerHealthDelayMs,
  { immediate: false },
)

const markPlayerHealthy = () => {
  hasPlayerActivity.value = true
  playerHealthNotice.value = ''
  clearPlayerHealthTimeout()
}

const showPlayerUnavailableNotice = () => {
  if (isActiveEpisodeUnaired.value) return

  playerHealthNotice.value = playerUnavailableMessage
  clearPlayerHealthTimeout()
}

const schedulePlayerHealthCheck = () => {
  if (!import.meta.client || isActiveEpisodeUnaired.value) return

  clearPlayerHealthTimeout()
  startPlayerHealthTimeout()
}

const retryPlayer = () => {
  if (isActiveEpisodeUnaired.value) return

  hasPlayerActivity.value = false
  playerHealthNotice.value = ''
  playerReloadKey.value += 1
  schedulePlayerHealthCheck()
}

const parsePlayerMessage = (event: MessageEvent) => {
  let data = event.data as PlayerMessage | string

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data) as PlayerMessage
    } catch {
      return
    }
  }

  if (data.channel !== 'megacloud' && data.type !== 'watching-log') {
    return
  }

  if (data.event === 'time') {
    markPlayerHealthy()
    currentTime.value = data.time || 0
    duration.value = data.duration || 0
    progress.value = data.percent || 0
    autoMarkActiveEpisodeWatched()
    persistActiveProgress()
  }

  if (data.type === 'watching-log') {
    markPlayerHealthy()
    currentTime.value = data.currentTime || 0
    duration.value = data.duration || 0
    progress.value = duration.value
      ? Math.min(Math.round((currentTime.value / duration.value) * 100), 100)
      : progress.value
    autoMarkActiveEpisodeWatched()
    persistActiveProgress()
  }

  if (data.event === 'complete') {
    markPlayerHealthy()
    progress.value = 100
    autoMarkActiveEpisodeWatched()
    persistActiveProgress(true)

    if (isAutoNextEnabled.value && nextPlayableEpisodeTo.value) {
      navigateTo(nextPlayableEpisodeTo.value)
    }
  }

  if (data.event === 'error') {
    showPlayerUnavailableNotice()
  }
}

const nextEpisodeNumber = computed(() => {
  return episodeNumbers.value.find((item) => item > activeEpisode.value) || 0
})

const nextEpisodeTo = computed(() => {
  if (!nextEpisodeNumber.value) {
    return ''
  }

  return `/watch/${id.value}?episode=${nextEpisodeNumber.value}&language=${language.value}`
})

const nextPlayableEpisodeNumber = computed(() => {
  return releasedEpisodeNumbers.value.find((item) => item > activeEpisode.value) || 0
})

const nextPlayableEpisodeTo = computed(() => {
  if (!nextPlayableEpisodeNumber.value) {
    return ''
  }

  return `/watch/${id.value}?episode=${nextPlayableEpisodeNumber.value}&language=${language.value}`
})

const alternateLanguage = computed(() => (language.value === 'dub' ? 'sub' : 'dub'))

const alternateLanguageTo = computed(() => {
  return `/watch/${id.value}?episode=${activeEpisode.value}&language=${alternateLanguage.value}`
})

const previousEpisodeTo = computed(() => {
  const previousEpisode = episodeNumbers.value.filter((item) => item < activeEpisode.value).at(-1)

  if (!previousEpisode) {
    return ''
  }

  return `/watch/${id.value}?episode=${previousEpisode}&language=${language.value}`
})

const toggleSaved = () => {
  const media = anime.value

  if (!media) return

  toggleAnimeSaved({
    id: media.id,
    title: title.value,
    image: watchlistImage.value,
    episodes: media.episodes,
  })
}

watchEffect(() => {
  if (!import.meta.client || !episodeNumbers.value.length || episodeNumbers.value.includes(episode.value)) {
    return
  }

  navigateTo(`/watch/${id.value}?episode=${activeEpisode.value}&language=${language.value}`, {
    replace: true,
  })
})

watch(
  [playerSrc, isActiveEpisodeUnaired],
  ([, isUnaired]) => {
    const storedProgress = activeEpisodeProgress.value

    progress.value = storedProgress?.progress || 0
    currentTime.value = storedProgress?.currentTime || 0
    duration.value = storedProgress?.duration || 0
    hasPlayerActivity.value = false
    playerHealthNotice.value = ''
    playerReloadKey.value = 0
    lastProgressPersistedAt = 0

    if (isUnaired) {
      clearPlayerHealthTimeout()
    } else {
      schedulePlayerHealthCheck()
    }
  },
  { immediate: true },
)

watch(activeEpisodeCompletionProgress, autoMarkActiveEpisodeWatched, { immediate: true })

watch(
  activeEpisode,
  () => {
    const currentRange = episodeRangeOptions.value.find((range) => range.episodes.includes(activeEpisode.value))

    selectedEpisodeRangeIndex.value = currentRange?.index || 0
  },
  { immediate: true },
)

watch(visibleEpisodes, () => {
  if (activeSidebarIndex.value >= visibleEpisodes.value.length) {
    activeSidebarIndex.value = visibleEpisodes.value.length ? visibleEpisodes.value.length - 1 : -1
  }
})

const continueWatchingPayload = computed<WatchEntry | undefined>(() => {
  if (!anime.value || !activeEpisode.value || isActiveEpisodeUnaired.value) return undefined

  return {
    id: anime.value.id,
    title: title.value,
    englishTitle: englishTitle.value,
    romajiTitle: romajiTitle.value,
    image: watchlistImage.value,
    episode: activeEpisode.value,
    language: language.value,
  }
})

watch(
  continueWatchingPayload,
  (watchEntry) => {
    if (!import.meta.client || !watchEntry) {
      return
    }

    userPreferences.setContinueWatching(watchEntry)
  },
  { immediate: true },
)

watch(
  watchPlayerColumn,
  () => {
    void nextTick(updateWatchLayoutHeight)
  },
  { flush: 'post' },
)

watch(
  [playerHealthNotice, language, activeEpisode, isActiveEpisodeUnaired],
  () => {
    void nextTick(updateWatchLayoutHeight)
  },
  { flush: 'post' },
)

useEventListener(import.meta.client ? window : null, 'message', parsePlayerMessage)
useEventListener(import.meta.client ? window : null, 'keydown', handleKeyboardShortcut)
useEventListener(import.meta.client ? window : null, 'resize', updateWatchLayoutHeight)

onMounted(() => {
  void nextTick(() => {
    updateWatchLayoutHeight()
  })
})

onBeforeUnmount(() => {
  clearPlayerHealthTimeout()
})

useSeoMeta({
  title: () => `Watch ${title.value} Episode ${activeEpisode.value} - Noxy`,
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)] pt-16 text-[var(--color-text)] sm:pt-18">
    <button
      type="button"
      class="fixed inset-0 z-40 cursor-default border-0 bg-black/85 transition-opacity duration-150"
      :class="isLightOff ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'"
      :aria-hidden="isLightOff ? undefined : 'true'"
      :tabindex="isLightOff ? 0 : -1"
      aria-label="Turn light on"
      @click="isLightOff = false"
    />

    <section v-if="pending" class="mx-auto w-full max-w-[1660px] px-4 py-4 sm:px-6 lg:px-8">
      <div
        class="mb-5 h-11 w-[32rem] max-w-full animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]"
      />

      <div
        class="grid animate-pulse items-start gap-0 xl:grid-cols-[270px_minmax(0,920px)_300px] 2xl:grid-cols-[270px_minmax(0,1fr)_360px]"
      >
        <aside class="order-2 bg-[#151522] p-4 xl:order-1">
          <div class="h-4 w-28 rounded bg-[var(--color-background-soft)]" />
          <div class="mt-4 flex items-center gap-3">
            <div class="h-7 w-24 rounded bg-[var(--color-background-soft)]" />
            <div class="h-9 flex-1 rounded bg-[var(--color-background-soft)]" />
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <div v-for="item in 4" :key="item" class="h-9 rounded bg-[var(--color-background-soft)]" />
          </div>
          <div class="mt-5 space-y-3">
            <div v-for="item in 12" :key="item" class="grid grid-cols-[minmax(0,1fr)_28px] gap-3">
              <div class="h-4 rounded bg-[var(--color-background-soft)]" />
              <div class="h-4 rounded bg-[var(--color-background-soft)]" />
            </div>
          </div>
        </aside>

        <div class="order-1 min-w-0 bg-black xl:order-2">
          <div class="aspect-video bg-black" />
          <div class="bg-[#151522] px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <div class="h-4 w-32 rounded bg-[var(--color-background-soft)]" />
              <div class="h-4 w-16 rounded bg-[var(--color-background-soft)]" />
            </div>
            <div class="mt-2 h-1.5 rounded bg-white/10" />
          </div>
          <div class="bg-black px-4 py-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap gap-2">
                <div v-for="item in 4" :key="item" class="h-9 w-28 rounded bg-white/5" />
              </div>
              <div class="flex flex-wrap gap-2">
                <div v-for="item in 3" :key="item" class="h-9 w-24 rounded bg-white/5" />
              </div>
            </div>
          </div>
          <div class="grid bg-[#201f34] md:grid-cols-[206px_minmax(0,1fr)]">
            <div class="min-h-26 bg-pink-300/35" />
            <div class="flex items-center gap-4 px-4 py-5">
              <div class="h-5 w-20 rounded bg-[var(--color-background-soft)]" />
              <div class="h-11 w-20 rounded bg-pink-300/35" />
              <div class="h-11 w-20 rounded bg-[var(--color-background-mute)]" />
            </div>
          </div>
        </div>

        <aside class="order-3 hidden bg-[var(--color-background)] pl-7 xl:block">
          <div class="aspect-[2/3] w-28 bg-[var(--color-background-soft)]" />
          <div class="mt-7 h-7 w-64 rounded bg-[var(--color-background-soft)]" />
          <div class="mt-4 flex gap-2">
            <div v-for="item in 4" :key="item" class="h-5 w-12 rounded bg-[var(--color-background-soft)]" />
          </div>
          <div class="mt-6 space-y-2">
            <div class="h-3 w-full rounded bg-[var(--color-background-soft)]" />
            <div class="h-3 w-11/12 rounded bg-[var(--color-background-soft)]" />
            <div class="h-3 w-2/3 rounded bg-[var(--color-background-soft)]" />
          </div>
          <div class="mt-6 space-y-3">
            <div v-for="item in 8" :key="item" class="grid grid-cols-[68px_minmax(0,1fr)] gap-2">
              <div class="h-3 rounded bg-[var(--color-background-soft)]" />
              <div class="h-3 rounded bg-[var(--color-background-soft)]" />
            </div>
          </div>
        </aside>
      </div>
    </section>

    <NErrorState
      v-else-if="error"
      :status-code="error.statusCode || 404"
      title="Episode not found"
      :message="
        error.statusMessage ||
        'This episode could not be loaded. The anime id may be invalid, or the title is no longer available.'
      "
    />

    <section v-else-if="anime" class="mx-auto w-full max-w-[1660px] px-0 py-0 sm:px-6 sm:py-4 lg:px-8">
      <nav class="watch-breadcrumb mx-4 mb-4 sm:mx-0 sm:mb-5" aria-label="Breadcrumb">
        <ol
          class="m-0 flex min-w-0 list-none items-center gap-1.5 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/85 px-2 py-2 text-xs shadow-[0_10px_30px_rgb(0_0_0/12%)] sm:px-3"
        >
          <li class="shrink-0">
            <NuxtLink
              to="/"
              class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-bold text-[var(--color-text)]/75 no-underline transition hover:bg-white/5 hover:text-pink-300"
            >
              <div i-material-symbols-home-rounded class="text-base" />
              <span>Home</span>
            </NuxtLink>
          </li>

          <li class="flex shrink-0 items-center" aria-hidden="true">
            <div i-material-symbols-chevron-right-rounded class="text-lg text-[var(--color-text)]/25" />
          </li>

          <li class="shrink-0">
            <NuxtLink
              :to="{ path: '/filter', query: { type: anime.format || 'TV' } }"
              class="inline-flex h-8 items-center rounded-lg bg-[var(--color-background-mute)]/65 px-2.5 font-black uppercase tracking-wide text-[var(--color-text)]/75 no-underline transition hover:bg-[var(--color-background-mute)] hover:text-pink-300"
            >
              {{ formatText(anime.format) || 'TV' }}
            </NuxtLink>
          </li>

          <li class="flex shrink-0 items-center" aria-hidden="true">
            <div i-material-symbols-chevron-right-rounded class="text-lg text-[var(--color-text)]/25" />
          </li>

          <li class="min-w-0">
            <NuxtLink
              :to="`/anime/${id}`"
              class="group flex h-8 min-w-0 max-w-[52vw] items-center rounded-lg px-2.5 font-semibold text-[var(--color-text)]/75 no-underline transition hover:bg-white/5 hover:text-pink-300 sm:max-w-[32rem]"
            >
              <NTitleTransition :text="title" :transition-key="selectedLanguage" class="block min-w-0 truncate" />
            </NuxtLink>
          </li>

          <li class="flex shrink-0 items-center" aria-hidden="true">
            <div i-material-symbols-chevron-right-rounded class="text-lg text-[var(--color-text)]/25" />
          </li>

          <li
            class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-pink-300/20 bg-pink-300/10 px-3 font-black text-pink-200"
            aria-current="page"
          >
            <div i-material-symbols-play-circle-rounded class="text-base" />
            <span>Episode {{ activeEpisode }}</span>
          </li>
        </ol>
      </nav>

      <div
        class="grid items-start gap-0 xl:grid-cols-[270px_minmax(0,920px)_300px] 2xl:grid-cols-[270px_minmax(0,1fr)_360px]"
        :style="watchLayoutStyle"
      >
        <aside
          class="order-2 flex min-h-0 flex-col bg-[#151522] xl:order-1 xl:overflow-hidden"
          :style="watchColumnStyle"
        >
          <div class="shrink-0 px-4 pb-2 pt-4">
            <h2 class="text-xs font-bold text-[var(--color-heading)]">List of episodes:</h2>

            <div class="mt-3 grid grid-cols-[minmax(104px,auto)_minmax(0,1fr)] items-center gap-3">
              <div class="relative min-w-0">
                <button
                  type="button"
                  class="inline-flex h-9 max-w-full items-center gap-3 border-0 bg-transparent p-0 text-xs font-semibold transition hover:text-pink-300"
                  :class="isEpisodeRangeOpen ? 'text-pink-300' : 'text-white'"
                  :aria-expanded="isEpisodeRangeOpen"
                  aria-haspopup="menu"
                  @click="isEpisodeRangeOpen = !isEpisodeRangeOpen"
                >
                  <div i-material-symbols-format-list-bulleted-rounded class="text-base" />
                  {{ selectedEpisodeRange?.label || '001-100' }}
                  <div
                    i-material-symbols-keyboard-arrow-down-rounded
                    class="text-base transition"
                    :class="isEpisodeRangeOpen ? 'rotate-180' : ''"
                  />
                </button>

                <div
                  v-if="isEpisodeRangeOpen"
                  class="absolute left-0 top-full z-30 mt-2 max-h-72 w-56 overflow-y-auto overscroll-contain rounded border border-white/10 bg-[#201f34] p-1 shadow-xl shadow-black/40"
                  role="menu"
                >
                  <button
                    v-for="range in episodeRangeOptions"
                    :key="range.label"
                    type="button"
                    class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded border-0 px-3 py-2.5 text-left text-xs font-bold transition"
                    :class="
                      range.index === selectedEpisodeRangeIndex
                        ? 'bg-[#302d4a] text-pink-200'
                        : 'bg-transparent text-[var(--color-heading)] hover:bg-[#2d2a45] hover:text-pink-300'
                    "
                    role="menuitem"
                    @click="selectEpisodeRange(range.index)"
                  >
                    <span class="min-w-0">
                      <span class="block text-[10px] font-black uppercase text-pink-300/80">Episodes</span>
                      <span class="block truncate">{{ range.label }}</span>
                    </span>
                    <span class="rounded bg-pink-300/15 px-2 py-1 text-[10px] font-black text-pink-200">
                      {{ getEpisodeRangeWatchedCount(range.episodes) }} watched
                    </span>
                  </button>
                </div>
              </div>
              <div class="flex min-w-0 items-center gap-2 rounded border border-white/10 bg-transparent px-3 py-2">
                <div i-material-symbols-search-rounded class="shrink-0 text-base text-white" />
                <input
                  ref="episodeSearchInput"
                  v-model="episodeSearch"
                  type="search"
                  inputmode="numeric"
                  placeholder="Find number"
                  class="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text)]/45"
                  @focus="focusActiveSidebarEpisode"
                  @keydown="handleEpisodeSearchKeydown"
                />
              </div>
            </div>
          </div>

          <div class="max-h-[520px] min-h-0 overflow-y-auto pb-3 sm:max-h-[620px] xl:max-h-none xl:flex-1 xl:pb-0">
            <template v-if="visibleEpisodes.length">
              <div v-if="shouldUseEpisodeGrid" class="grid grid-cols-5 gap-1.5 px-3 pb-3 pt-1">
                <NuxtLink
                  v-for="(item, itemIndex) in visibleEpisodes"
                  :key="item"
                  :to="`/watch/${id}?episode=${item}&language=${language}`"
                  class="grid h-8 min-w-0 place-items-center rounded text-center text-xs font-black tabular-nums no-underline transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                  :class="getEpisodeGridItemClass(item, itemIndex)"
                  :aria-current="item === activeEpisode ? 'page' : undefined"
                  :aria-label="`Episode ${item}`"
                >
                  <span class="truncate px-1">{{ item }}</span>
                </NuxtLink>
              </div>

              <template v-else>
                <NuxtLink
                  v-for="(item, itemIndex) in visibleEpisodes"
                  :key="item"
                  :to="`/watch/${id}?episode=${item}&language=${language}`"
                  class="grid min-h-10 grid-cols-[36px_minmax(0,1fr)_34px] items-center gap-2 px-3 text-xs font-medium no-underline transition hover:bg-[#2d2a45] hover:text-pink-300"
                  :class="getEpisodeListItemClass(item, itemIndex)"
                  :aria-current="item === activeEpisode ? 'page' : undefined"
                >
                  <span class="text-center text-sm font-semibold tabular-nums text-[var(--color-heading)]/80">
                    {{ item }}
                  </span>
                  <span class="min-w-0 truncate">{{ getEpisodeListTitle(item) }}</span>
                  <span class="flex items-center justify-end">
                    <div
                      v-if="isEpisodeUnaired(item)"
                      i-material-symbols-schedule-rounded
                      class="text-lg text-amber-200"
                      title="Episode not aired"
                    />
                    <div
                      v-else-if="item === activeEpisode"
                      i-material-symbols-play-circle
                      class="text-xl text-pink-300"
                    />
                    <div
                      v-else-if="isEpisodeComplete(item)"
                      i-material-symbols-check-circle-rounded
                      class="text-lg text-emerald-300"
                    />
                    <span v-else-if="getEpisodeProgress(item)?.progress" class="text-[10px] font-black text-pink-300">
                      {{ getEpisodeProgressLabel(item) }}
                    </span>
                  </span>
                </NuxtLink>
              </template>
            </template>

            <p v-else class="px-4 py-6 text-sm text-[var(--color-text)]/60">No episode found.</p>
          </div>
        </aside>

        <div ref="watchPlayerColumn" class="order-1 min-w-0 bg-black xl:order-2">
          <div class="relative z-50 aspect-video overflow-hidden bg-black">
            <iframe
              v-if="!isActiveEpisodeUnaired"
              :key="playerFrameKey"
              :src="playerSrc"
              class="relative z-0 h-full w-full"
              frameborder="0"
              scrolling="no"
              allowfullscreen
              @error="showPlayerUnavailableNotice"
              @load="schedulePlayerHealthCheck"
            />

            <Transition
              enter-active-class="transition-opacity duration-200 ease-out"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              leave-active-class="transition-opacity duration-300 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <div
                v-if="!hasPlayerActivity"
                class="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-hidden bg-[#11111b] text-center text-white"
              >
                <NRemoteImage
                  v-if="playerShieldImage"
                  :src="playerShieldImage"
                  :alt="title"
                  :placeholder-color="anime.coverImage?.color"
                  class="absolute inset-0 h-full w-full scale-105 object-cover opacity-45 blur-[8px]"
                />
                <div v-else class="absolute inset-0 bg-[var(--color-background-soft)]" />
                <div class="absolute inset-0 bg-black/55" />
                <div
                  class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,168,212,.18),transparent_52%)]"
                />
                <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />

                <div class="relative z-10 w-full max-w-xl px-5 py-6">
                  <template v-if="isActiveEpisodeUnaired">
                    <div
                      class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-200 text-black shadow-lg shadow-black/30"
                    >
                      <div i-material-symbols-schedule-rounded class="text-3xl" />
                    </div>
                    <p class="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
                      Episode not aired
                    </p>
                    <h2 class="mt-2 text-xl font-extrabold sm:text-3xl">Episode {{ activeEpisode }} is scheduled</h2>
                    <p class="mx-auto mt-2 max-w-lg text-xs leading-5 text-white/65 sm:text-sm">
                      <template v-if="activeEpisodeAiringLabel">
                        The next broadcast is scheduled for {{ activeEpisodeAiringLabel }}. Player access opens after
                        the broadcast begins.
                      </template>
                      <template v-else>
                        This releasing series has not reached Episode {{ activeEpisode }}. An exact broadcast time is
                        not available yet.
                      </template>
                    </p>

                    <div
                      class="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1.5 text-[10px] font-black text-amber-100 backdrop-blur-sm"
                      role="status"
                      aria-live="polite"
                    >
                      <span class="i-material-symbols-alarm-rounded text-base" />
                      <span>{{ activeEpisodeCountdown }}</span>
                      <span v-if="activeEpisodeAiringAt" class="text-white/35">•</span>
                      <span v-if="activeEpisodeAiringAt" class="text-white/55">{{ localTimezone }}</span>
                    </div>

                    <div
                      class="pointer-events-auto mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-black"
                    >
                      <NuxtLink
                        v-if="previousEpisodeTo"
                        :to="previousEpisodeTo"
                        class="inline-flex h-10 items-center justify-center gap-2 rounded bg-pink-300 px-4 text-black no-underline transition hover:bg-pink-200"
                      >
                        <span class="i-material-symbols-skip-previous-rounded text-lg" />
                        Previous episode
                      </NuxtLink>
                      <NuxtLink
                        :to="`/anime/${id}`"
                        class="inline-flex h-10 items-center justify-center rounded border border-white/20 bg-black/35 px-4 text-white no-underline transition hover:border-pink-300 hover:text-pink-300"
                      >
                        Anime details
                      </NuxtLink>
                    </div>
                  </template>

                  <template v-else-if="playerHealthNotice">
                    <div
                      class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-pink-300 text-black shadow-lg shadow-black/30"
                    >
                      <div i-material-symbols-play-disabled-rounded class="text-3xl" />
                    </div>
                    <p class="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-pink-300">
                      {{ language.toUpperCase() }} stream issue
                    </p>
                    <h2 class="mt-2 text-xl font-extrabold sm:text-3xl">Episode {{ activeEpisode }} couldn’t load</h2>
                    <p class="mx-auto mt-2 max-w-md text-xs leading-5 text-white/65 sm:text-sm">
                      Episode {{ activeEpisode }} has already aired, but the {{ language.toUpperCase() }} player did not
                      respond. Retry the player, switch language, or open another episode.
                    </p>

                    <div
                      class="pointer-events-auto mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-black"
                    >
                      <button
                        type="button"
                        class="inline-flex h-10 items-center justify-center gap-2 rounded border-0 bg-pink-300 px-4 text-black transition hover:bg-pink-200"
                        @click="retryPlayer"
                      >
                        <div i-material-symbols-refresh-rounded class="text-lg" />
                        Retry player
                      </button>
                      <NuxtLink
                        :to="alternateLanguageTo"
                        class="inline-flex h-10 items-center justify-center gap-2 rounded border border-white/20 bg-black/35 px-4 text-white no-underline transition hover:border-pink-300 hover:text-pink-300"
                      >
                        <div i-material-symbols-closed-caption class="text-lg" />
                        Try {{ alternateLanguage.toUpperCase() }}
                      </NuxtLink>
                      <NuxtLink
                        v-if="nextEpisodeTo"
                        :to="nextEpisodeTo"
                        class="inline-flex h-10 items-center justify-center gap-2 rounded border border-white/20 bg-black/35 px-4 text-white no-underline transition hover:border-pink-300 hover:text-pink-300"
                      >
                        Next episode
                        <div i-material-symbols-skip-next-rounded class="text-lg" />
                      </NuxtLink>
                      <NuxtLink
                        :to="`/anime/${id}`"
                        class="inline-flex h-10 items-center justify-center rounded border border-white/20 bg-black/35 px-4 text-white no-underline transition hover:border-pink-300 hover:text-pink-300"
                      >
                        Anime details
                      </NuxtLink>
                    </div>
                  </template>

                  <template v-else>
                    <div
                      class="relative mx-auto h-9 w-9 animate-spin text-pink-300 sm:h-16 sm:w-16"
                      style="animation-duration: 1.1s"
                      aria-hidden="true"
                    >
                      <span
                        class="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-current shadow-[0_0_10px_rgba(249,168,212,.8)] sm:h-3 sm:w-3 sm:shadow-[0_0_14px_rgba(249,168,212,.8)]"
                      />
                      <span
                        class="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-current opacity-70 sm:h-3 sm:w-3"
                      />
                      <span
                        class="absolute bottom-0.5 left-1 h-2 w-2 rounded-full bg-current opacity-40 sm:bottom-1 sm:left-1.5 sm:h-3 sm:w-3"
                      />
                    </div>
                    <p class="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-pink-300">
                      Preparing {{ language.toUpperCase() }} stream
                    </p>
                    <h2 class="mt-2 line-clamp-1 text-lg font-extrabold sm:text-2xl">
                      Loading Episode {{ activeEpisode }}
                    </h2>
                    <p class="mx-auto mt-2 max-w-md text-xs leading-5 text-white/65 sm:text-sm">
                      Please wait while Noxy connects to the video source. Playback will begin as soon as the player is
                      ready.
                    </p>
                    <div
                      class="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[10px] font-bold text-white/65 backdrop-blur-sm"
                      role="status"
                      aria-live="polite"
                    >
                      <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                      Connecting to player
                    </div>
                  </template>
                </div>
              </div>
            </Transition>
          </div>

          <div class="overflow-hidden bg-[#202038] bg-[linear-gradient(90deg,rgba(249,168,212,.09),transparent_48%)]">
            <div
              class="grid grid-cols-3 gap-px bg-white/10 p-px text-white sm:flex sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1 sm:bg-black sm:px-3 sm:py-2 xl:justify-between"
            >
              <div class="contents sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                <button
                  type="button"
                  class="flex min-h-14 appearance-none flex-col items-center justify-center gap-1 border-0 bg-black px-2 py-2 text-[10px] font-bold text-white outline-none transition hover:bg-[#181824] hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-300 sm:h-9 sm:min-h-0 sm:flex-row sm:rounded sm:bg-transparent sm:px-2.5 sm:py-0 sm:text-xs sm:focus-visible:ring-0"
                  title="Toggle light"
                  @click="isLightOff = !isLightOff"
                >
                  <div
                    i-material-symbols-lightbulb-rounded
                    class="text-xl sm:text-base"
                    :class="isLightOff ? 'text-white/55' : 'text-pink-300'"
                  />
                  <span class="inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Light</span>
                    <span :class="isLightOff ? 'text-white/45' : 'text-emerald-300'">
                      {{ isLightOff ? 'Off' : 'On' }}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  class="flex min-h-14 appearance-none flex-col items-center justify-center gap-1 border-0 bg-black px-2 py-2 text-[10px] font-bold text-white outline-none transition hover:bg-[#181824] hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-300 sm:h-9 sm:min-h-0 sm:flex-row sm:rounded sm:bg-transparent sm:px-2.5 sm:py-0 sm:text-xs sm:focus-visible:ring-0"
                  @click="isAutoNextEnabled = !isAutoNextEnabled"
                >
                  <div
                    i-material-symbols-skip-next-rounded
                    class="text-xl sm:text-base"
                    :class="isAutoNextEnabled ? 'text-pink-300' : 'text-white/55'"
                  />
                  <span class="inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Auto</span>
                    <span :class="isAutoNextEnabled ? 'text-emerald-300' : 'text-white/45'">
                      {{ isAutoNextEnabled ? 'On' : 'Off' }}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  class="flex min-h-14 appearance-none flex-col items-center justify-center gap-1 border-0 bg-black px-2 py-2 text-[10px] font-bold text-white outline-none transition hover:bg-[#181824] hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-300 sm:h-9 sm:min-h-0 sm:flex-row sm:rounded sm:bg-transparent sm:px-2.5 sm:py-0 sm:text-xs sm:focus-visible:ring-0"
                  :class="isActiveEpisodeUnaired ? 'cursor-not-allowed opacity-35' : ''"
                  :title="isActiveEpisodeUnaired ? 'Episode not aired' : 'Mark watched'"
                  :disabled="isActiveEpisodeUnaired"
                  @click="toggleActiveEpisodeWatched"
                >
                  <div
                    :class="
                      isActiveEpisodeUnaired
                        ? 'i-material-symbols-schedule-rounded text-xl text-amber-200 sm:text-base'
                        : activeEpisodeWatched
                          ? 'i-material-symbols-check-circle-rounded text-xl text-emerald-300 sm:text-base'
                          : 'i-material-symbols-check-circle-outline-rounded text-xl text-white/75 sm:text-base'
                    "
                  />
                  <span class="whitespace-nowrap">
                    {{ isActiveEpisodeUnaired ? 'Scheduled' : activeEpisodeWatched ? 'Watched' : 'Mark watched' }}
                  </span>
                </button>
              </div>

              <div class="contents sm:ml-auto sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                <NuxtLink
                  v-if="previousEpisodeTo"
                  :to="previousEpisodeTo"
                  class="flex min-h-14 flex-col items-center justify-center gap-1 bg-black px-2 py-2 text-[10px] font-bold text-white no-underline outline-none transition hover:bg-[#181824] hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-300 sm:h-9 sm:min-h-0 sm:flex-row sm:rounded sm:bg-transparent sm:px-2.5 sm:py-0 sm:text-xs sm:focus-visible:ring-0"
                  title="Previous episode"
                >
                  <div i-material-symbols-fast-rewind-rounded class="text-xl sm:text-base" />
                  <span>Previous</span>
                </NuxtLink>
                <span
                  v-else
                  class="flex min-h-14 flex-col items-center justify-center gap-1 bg-black px-2 py-2 text-[10px] font-bold text-white/25 sm:h-9 sm:min-h-0 sm:flex-row sm:rounded sm:bg-transparent sm:px-2.5 sm:py-0 sm:text-xs"
                  aria-disabled="true"
                >
                  <div i-material-symbols-fast-rewind-rounded class="text-xl sm:text-base" />
                  <span>Previous</span>
                </span>
                <NuxtLink
                  v-if="nextEpisodeTo"
                  :to="nextEpisodeTo"
                  class="flex min-h-14 flex-col items-center justify-center gap-1 bg-black px-2 py-2 text-[10px] font-bold text-white no-underline outline-none transition hover:bg-[#181824] hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-300 sm:h-9 sm:min-h-0 sm:flex-row-reverse sm:rounded sm:bg-transparent sm:px-2.5 sm:py-0 sm:text-xs sm:focus-visible:ring-0"
                  title="Next episode"
                >
                  <div i-material-symbols-fast-forward-rounded class="text-xl sm:text-base" />
                  <span>Next</span>
                </NuxtLink>
                <span
                  v-else
                  class="flex min-h-14 flex-col items-center justify-center gap-1 bg-black px-2 py-2 text-[10px] font-bold text-white/25 sm:h-9 sm:min-h-0 sm:flex-row-reverse sm:rounded sm:bg-transparent sm:px-2.5 sm:py-0 sm:text-xs"
                  aria-disabled="true"
                >
                  <div i-material-symbols-fast-forward-rounded class="text-xl sm:text-base" />
                  <span>Next</span>
                </span>
                <button
                  type="button"
                  class="flex min-h-14 appearance-none flex-col items-center justify-center gap-1 border-0 bg-black px-2 py-2 text-[10px] font-bold text-white outline-none transition hover:bg-[#181824] hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-300 sm:h-9 sm:min-h-0 sm:flex-row sm:rounded sm:bg-transparent sm:px-2.5 sm:py-0 sm:text-xs sm:focus-visible:ring-0"
                  :aria-label="isSaved ? 'Remove from watchlist' : 'Add to watchlist'"
                  :title="isSaved ? 'Remove from watchlist' : 'Add to watchlist'"
                  @click="toggleSaved"
                >
                  <div
                    v-if="isSaved"
                    i-material-symbols-bookmark-check-rounded
                    class="text-xl text-pink-300 sm:text-base"
                  />
                  <div v-else i-material-symbols-bookmark-add-rounded class="text-xl sm:text-base" />
                  <span class="whitespace-nowrap">{{ isSaved ? 'Listed' : 'My list' }}</span>
                </button>
              </div>
            </div>

            <div
              class="flex min-h-18 items-center justify-between gap-3 border-t border-pink-300/15 px-3 py-3 sm:min-h-20 sm:px-5"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div
                  class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-black shadow-lg sm:h-11 sm:w-11"
                  :class="
                    isActiveEpisodeUnaired ? 'bg-amber-200 shadow-amber-200/10' : 'bg-pink-300 shadow-pink-300/10'
                  "
                >
                  <div
                    :class="
                      isActiveEpisodeUnaired
                        ? 'i-material-symbols-schedule-rounded text-2xl'
                        : 'i-material-symbols-play-arrow-rounded ml-0.5 text-2xl'
                    "
                  />
                </div>
                <div class="min-w-0">
                  <p
                    class="text-[9px] font-black uppercase tracking-[0.18em] sm:text-[10px]"
                    :class="isActiveEpisodeUnaired ? 'text-amber-200/80' : 'text-pink-300/75'"
                  >
                    {{ isActiveEpisodeUnaired ? 'Scheduled episode' : 'Now playing' }}
                  </p>
                  <p class="mt-0.5 truncate text-sm font-extrabold text-[var(--color-heading)] sm:text-base">
                    Episode {{ activeEpisode }}
                  </p>
                </div>
              </div>

              <div class="flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Language selector">
                <div class="hidden items-center gap-2 text-xs font-bold text-[var(--color-text)]/60 sm:flex">
                  <span
                    class="grid h-7 min-w-7 place-items-center rounded bg-pink-300/15 px-1 text-[10px] font-black text-pink-200"
                  >
                    CC
                  </span>
                  <span>Language</span>
                </div>

                <div class="grid grid-cols-2 gap-1 rounded bg-black/25 p-1 ring-1 ring-white/5">
                  <NuxtLink
                    :to="`/watch/${id}?episode=${activeEpisode}&language=sub`"
                    class="inline-flex h-9 min-w-12 items-center justify-center rounded px-3 text-center text-xs font-black no-underline transition sm:h-10 sm:min-w-20 sm:px-5 sm:text-sm"
                    :class="
                      language === 'sub'
                        ? 'bg-pink-300 text-black shadow-sm shadow-black/20'
                        : 'bg-transparent text-[var(--color-text)]/60 hover:bg-white/5 hover:text-pink-300'
                    "
                  >
                    Sub
                  </NuxtLink>
                  <NuxtLink
                    :to="`/watch/${id}?episode=${activeEpisode}&language=dub`"
                    class="inline-flex h-9 min-w-12 items-center justify-center rounded px-3 text-center text-xs font-black no-underline transition sm:h-10 sm:min-w-20 sm:px-5 sm:text-sm"
                    :class="
                      language === 'dub'
                        ? 'bg-pink-300 text-black shadow-sm shadow-black/20'
                        : 'bg-transparent text-[var(--color-text)]/60 hover:bg-white/5 hover:text-pink-300'
                    "
                  >
                    Dub
                  </NuxtLink>
                </div>
              </div>
            </div>

            <NEpisodeReaction
              v-if="shouldShowEpisodeReaction"
              :episode="activeEpisode"
              :reaction="activeEpisodeReaction"
              @select="toggleActiveEpisodeReaction"
            />
          </div>
        </div>

        <aside
          class="order-3 bg-[var(--color-background)] px-4 py-5 sm:px-5 xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden xl:bg-transparent xl:px-0 xl:py-0 xl:pl-5 2xl:pl-7"
          :style="watchColumnStyle"
        >
          <section
            class="overflow-hidden rounded-xl border border-white/8 bg-[#181725] shadow-xl shadow-black/10 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col"
            aria-labelledby="watch-anime-details-title"
          >
            <div class="relative shrink-0 overflow-hidden border-b border-white/8 p-4">
              <NRemoteImage
                v-if="playerShieldImage"
                :src="playerShieldImage"
                alt=""
                aria-hidden="true"
                class="absolute inset-0 h-full w-full scale-125 object-cover opacity-20 blur-xl"
              />
              <span
                class="absolute inset-0 bg-[linear-gradient(110deg,rgba(24,23,37,.96),rgba(24,23,37,.82)_58%,rgba(249,168,212,.1))]"
              />

              <div
                class="relative grid grid-cols-[86px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[104px_minmax(0,1fr)] xl:grid-cols-[86px_minmax(0,1fr)]"
              >
                <div
                  class="relative self-center translate-y-2 overflow-hidden bg-[var(--color-background-mute)] shadow-lg shadow-black/30"
                >
                  <NRemoteImage
                    v-if="anime?.coverImage?.extraLarge || anime?.coverImage?.large || anime?.coverImage?.medium"
                    :src="anime.coverImage.extraLarge || anime.coverImage.large || anime.coverImage.medium"
                    :alt="title"
                    :placeholder-color="anime.coverImage.color"
                    class="aspect-[2/3] w-full object-cover"
                  />
                  <span v-else class="grid aspect-[2/3] w-full place-items-center text-pink-300/60">
                    <span class="i-material-symbols-movie-outline-rounded text-3xl" />
                  </span>
                </div>

                <div class="min-w-0 py-0.5">
                  <NTitleTransition
                    id="watch-anime-details-title"
                    as="h1"
                    :text="title"
                    :transition-key="selectedLanguage"
                    class="text-lg font-extrabold leading-5 text-[var(--color-heading)] sm:text-xl sm:leading-6 xl:text-lg xl:leading-5 2xl:text-xl 2xl:leading-6"
                  />

                  <div class="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-white/70">
                    <span class="rounded bg-pink-300 px-1.5 py-0.5 font-black text-black">HD</span>
                    <span class="rounded bg-emerald-200 px-1.5 py-0.5 font-black text-black">CC</span>
                    <template v-for="meta in mediaMeta" :key="meta">
                      <span class="text-white/25">•</span>
                      <span>{{ meta }}</span>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div class="p-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">
              <h2 class="text-xs font-extrabold text-[var(--color-heading)]">Synopsis</h2>

              <p class="mt-3 line-clamp-4 text-xs leading-5 text-[var(--color-text)]/75">
                {{ cleanDescription || 'No description is available yet.' }}
              </p>

              <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                <div class="rounded-lg border border-white/7 bg-white/[0.035] p-3">
                  <strong class="text-sm text-[var(--color-heading)]">
                    {{ anime.averageScore ? `${anime.averageScore}%` : '?' }}
                  </strong>
                  <p class="mt-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text)]/45">Score</p>
                </div>

                <div class="rounded-lg border border-white/7 bg-white/[0.035] p-3">
                  <strong class="text-sm text-[var(--color-heading)]">{{ anime.episodes || '?' }}</strong>
                  <p class="mt-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text)]/45">Episodes</p>
                </div>

                <div class="rounded-lg border border-white/7 bg-white/[0.035] p-3">
                  <strong class="text-sm text-[var(--color-heading)]">
                    {{ anime.duration ? `${anime.duration}m` : '?' }}
                  </strong>
                  <p class="mt-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text)]/45">Runtime</p>
                </div>

                <div class="rounded-lg border border-white/7 bg-white/[0.035] p-3">
                  <strong class="text-sm uppercase text-[var(--color-heading)]">{{ language }}</strong>
                  <p class="mt-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text)]/45">Playback</p>
                </div>
              </div>

              <div v-if="watchInformationDetails.length" class="mt-5">
                <h2 class="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text)]/45">
                  Information
                </h2>
                <dl class="mt-2 overflow-hidden rounded-lg border border-white/7 bg-black/10 text-[11px] leading-4">
                  <div
                    v-for="[label, value] in watchInformationDetails"
                    :key="label"
                    class="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-b border-white/6 px-3 py-2.5 last:border-b-0"
                  >
                    <dt class="text-[var(--color-text)]/45">{{ label }}</dt>
                    <dd class="min-w-0 font-semibold text-[var(--color-heading)]">{{ value }}</dd>
                  </div>
                </dl>
              </div>

              <div v-if="visibleAnimeGenres.length" class="mt-5">
                <h2 class="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text)]/45">Genres</h2>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <NuxtLink
                    v-for="genre in visibleAnimeGenres.slice(0, 7)"
                    :key="genre"
                    :to="`/genre/${encodeURIComponent(genre)}`"
                    class="rounded-full border border-pink-300/15 bg-pink-300/8 px-2.5 py-1 text-[10px] font-bold text-pink-200 no-underline transition hover:border-pink-300/40 hover:bg-pink-300/15"
                  >
                    {{ genre }}
                  </NuxtLink>
                </div>
              </div>
            </div>

            <NuxtLink
              :to="`/anime/${id}`"
              class="mx-4 mb-4 mt-1 inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/8 bg-white/5 px-3 text-xs font-bold text-[var(--color-heading)] no-underline transition hover:border-pink-300/35 hover:bg-pink-300/10 hover:text-pink-200"
            >
              View full details
              <span class="i-material-symbols-arrow-forward-rounded text-base" />
            </NuxtLink>
          </section>
        </aside>
      </div>

      <section
        v-if="moreSeasonItems.length > 1 || relatedAnimeItems.length || recommendationItems.length"
        class="mt-8 px-4 sm:px-0"
      >
        <div
          v-if="moreSeasonItems.length > 1"
          class="mb-8 rounded-xl border border-white/8 bg-[linear-gradient(135deg,rgba(249,168,212,.07),rgba(32,31,52,.7)_45%,rgba(24,24,39,.9))] p-4 sm:p-5"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-pink-300/65">Season collection</p>
              <h2 class="mt-1 text-xl font-extrabold text-[var(--color-heading)]">More Seasons</h2>
              <p class="mt-1 text-xs text-[var(--color-text)]/55">Continue watching another part of this series.</p>
            </div>
            <span
              class="grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-pink-300/15 px-2 text-xs font-black text-pink-200"
            >
              {{ moreSeasonItems.length }}
            </span>
          </div>

          <div class="mt-4 grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr))">
            <NAnimeHoverCard
              v-for="(item, index) in moreSeasonItems"
              :key="item.id"
              :anime-id="item.id"
              class="min-w-0"
            >
              <NuxtLink
                :to="getMoreSeasonLink(item)"
                class="group relative flex h-24 min-w-0 overflow-hidden border text-white no-underline transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 sm:h-26"
                :class="
                  item.id === anime.id
                    ? 'border-pink-300/80 ring-1 ring-pink-300/25'
                    : 'border-white/10 hover:-translate-y-0.5 hover:border-pink-300/60 hover:shadow-xl hover:shadow-black/20'
                "
                :aria-current="item.id === anime.id ? 'page' : undefined"
              >
                <NRemoteImage
                  v-if="getMoreSeasonImage(item)"
                  :src="getMoreSeasonImage(item)"
                  :alt="getMoreSeasonLabel(item, index)"
                  :placeholder-color="item.coverImage?.color"
                  class="absolute inset-0 h-full w-full scale-105 object-cover opacity-65 blur-[2px] transition duration-500 group-hover:scale-110 group-hover:opacity-75"
                  loading="lazy"
                />
                <span v-else class="absolute inset-0 bg-[var(--color-background-mute)]" />
                <span class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/25" />
                <span class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />
                <span v-if="item.id === anime.id" class="absolute inset-0 bg-pink-300/8" />

                <span class="relative z-10 flex w-full flex-col justify-between p-3">
                  <span class="flex items-center justify-between gap-3">
                    <span
                      class="rounded bg-black/45 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/75 backdrop-blur-sm"
                    >
                      {{ getMoreSeasonLabel(item, index) }}
                    </span>
                    <span
                      v-if="item.id === anime.id"
                      class="inline-flex items-center gap-1 rounded bg-pink-300 px-2 py-1 text-[9px] font-black uppercase text-black"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-black" />
                      Current
                    </span>
                  </span>

                  <span class="flex min-w-0 items-end justify-between gap-3">
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-extrabold sm:text-base">
                        {{ getMoreSeasonLabel(item, index) }}
                      </span>
                      <span
                        v-if="getMoreSeasonMeta(item)"
                        class="mt-1 block truncate text-[10px] font-semibold text-white/60 sm:text-xs"
                      >
                        {{ getMoreSeasonMeta(item) }}
                      </span>
                    </span>
                    <span
                      class="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-black/30 text-white transition group-hover:border-pink-300 group-hover:bg-pink-300 group-hover:text-black"
                    >
                      <div
                        :class="
                          item.id === anime.id
                            ? 'i-material-symbols-play-arrow-rounded'
                            : 'i-material-symbols-arrow-forward-rounded'
                        "
                        class="text-lg"
                      />
                    </span>
                  </span>
                </span>
              </NuxtLink>
            </NAnimeHoverCard>
          </div>
        </div>

        <div
          v-if="recommendationItems.length || shouldShowSideAnimeRail"
          class="grid items-start gap-7"
          :class="
            shouldShowSideAnimeRail
              ? 'xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_360px]'
              : 'xl:grid-cols-1'
          "
        >
          <div v-if="recommendationItems.length" class="min-w-0">
            <div class="mb-4 flex items-center justify-between gap-4">
              <h2 class="text-xl font-extrabold text-[var(--color-heading)]">Recommended Anime</h2>
              <NuxtLink
                to="/category/you-may-also-watch"
                class="inline-flex items-center gap-1 text-sm font-bold text-pink-300 no-underline transition hover:text-pink-200"
              >
                <span>View more</span>
                <div i-material-symbols-chevron-right-rounded class="text-lg" />
              </NuxtLink>
            </div>

            <div
              class="grid grid-cols-2 gap-4 sm:grid-cols-3"
              :class="shouldShowSideAnimeRail ? 'xl:grid-cols-5 2xl:grid-cols-6' : 'xl:grid-cols-6'"
            >
              <NAnimeHoverCard v-for="item in recommendationItems" :key="item.id" :anime-id="item.id">
                <NuxtLink :to="`/anime/${item.id}`" class="group block min-w-0 text-[var(--color-text)] no-underline">
                  <div class="relative aspect-[3/4] overflow-hidden bg-[var(--color-background-soft)]">
                    <NRemoteImage
                      v-if="item.coverImage?.extraLarge || item.coverImage?.large"
                      :src="item.coverImage.extraLarge || item.coverImage.large"
                      :alt="getRelatedTitle(item.title)"
                      :placeholder-color="item.coverImage.color"
                      class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div v-else class="h-full w-full bg-[var(--color-background-mute)]" />
                  </div>

                  <NTitleTransition
                    as="h3"
                    :text="getRelatedTitle(item.title)"
                    :title="getRelatedTitle(item.title)"
                    :transition-key="`${selectedLanguage}-${item.id}`"
                    class="mt-3 truncate text-sm font-bold text-white transition group-hover:text-pink-300"
                  />
                  <div
                    v-if="relatedCardFormat(item) || relatedCardDate(item)"
                    class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text)]/70"
                  >
                    <span v-if="relatedCardFormat(item)">{{ relatedCardFormat(item) }}</span>
                    <span v-if="relatedCardFormat(item) && relatedCardDate(item)" class="text-[var(--color-text)]/40">
                      •
                    </span>
                    <span v-if="relatedCardDate(item)">{{ relatedCardDate(item) }}</span>
                  </div>
                </NuxtLink>
              </NAnimeHoverCard>
            </div>
          </div>

          <aside
            v-if="shouldShowSideAnimeRail"
            class="min-w-0 space-y-8"
            :class="recommendationItems.length ? '' : 'xl:col-start-2'"
          >
            <section v-if="relatedAnimeItems.length">
              <div class="mb-4 flex items-center justify-between gap-4">
                <h2 class="text-xl font-extrabold text-[var(--color-heading)]">Related Anime</h2>
                <NuxtLink
                  :to="`/anime/${id}`"
                  class="inline-flex items-center gap-1 text-sm font-bold text-pink-300 no-underline transition hover:text-pink-200"
                >
                  <span>View details</span>
                  <div i-material-symbols-chevron-right-rounded class="text-lg" />
                </NuxtLink>
              </div>

              <div class="overflow-hidden rounded bg-[var(--color-background-soft)]">
                <NAnimeHoverCard v-for="item in relatedAnimeItems" :key="item.id" :anime-id="item.id">
                  <div
                    class="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--color-border)] px-3 py-3 last:border-b-0"
                  >
                    <NuxtLink :to="`/anime/${item.id}`" class="group contents text-[var(--color-text)] no-underline">
                      <NRemoteImage
                        v-if="item.coverImage?.extraLarge || item.coverImage?.large"
                        :src="item.coverImage.extraLarge || item.coverImage.large"
                        :alt="getRelatedTitle(item.title)"
                        :placeholder-color="item.coverImage.color"
                        class="h-16 w-12 object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div v-else class="h-16 w-12 bg-[var(--color-background-mute)]" />

                      <div class="min-w-0">
                        <NTitleTransition
                          as="h3"
                          :text="getRelatedTitle(item.title)"
                          :title="getRelatedTitle(item.title)"
                          :transition-key="`${selectedLanguage}-${item.id}`"
                          class="truncate text-sm font-extrabold leading-5 text-[var(--color-heading)] transition group-hover:text-pink-300"
                        />
                      </div>
                    </NuxtLink>

                    <button
                      type="button"
                      class="grid h-8 w-8 shrink-0 place-items-center border-0 bg-transparent text-2xl font-black leading-none text-[var(--color-text)]/65 outline-none transition hover:bg-transparent hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                      :title="isAnimeSaved(item.id) ? 'Remove from watchlist' : 'Add to watchlist'"
                      :aria-label="
                        isAnimeSaved(item.id)
                          ? `Remove ${getRelatedTitle(item.title)} from watchlist`
                          : `Add ${getRelatedTitle(item.title)} to watchlist`
                      "
                      @click="toggleRelatedSaved(item)"
                    >
                      {{ isAnimeSaved(item.id) ? '-' : '+' }}
                    </button>
                  </div>
                </NAnimeHoverCard>
              </div>
            </section>

            <section v-if="shouldShowTrendingAnimes">
              <div class="mb-4 flex items-center justify-between gap-4">
                <h2 class="text-xl font-extrabold text-[var(--color-heading)]">Trending Anime</h2>
                <NuxtLink
                  to="/category/trending"
                  class="inline-flex items-center gap-1 text-sm font-bold text-pink-300 no-underline transition hover:text-pink-200"
                >
                  <span>View more</span>
                  <div i-material-symbols-chevron-right-rounded class="text-lg" />
                </NuxtLink>
              </div>

              <div class="overflow-hidden rounded bg-[var(--color-background-soft)]">
                <NAnimeHoverCard v-for="(item, index) in trendingAnimes" :key="item.id" :anime-id="item.id">
                  <div
                    class="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--color-border)] px-3 py-3 last:border-b-0"
                  >
                    <NuxtLink :to="`/anime/${item.id}`" class="group contents text-[var(--color-text)] no-underline">
                      <NRemoteImage
                        :src="item.image"
                        :alt="getTrendingTitle(item)"
                        :placeholder-color="item.color"
                        class="h-16 w-12 object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />

                      <div class="min-w-0">
                        <p class="text-[10px] font-black uppercase text-pink-300">#{{ index + 1 }} Trending</p>
                        <NTitleTransition
                          as="h3"
                          :text="getTrendingTitle(item)"
                          :transition-key="`${selectedLanguage}-${item.id}`"
                          class="mt-1 truncate text-sm font-extrabold leading-5 text-[var(--color-heading)] transition group-hover:text-pink-300"
                        />
                      </div>
                    </NuxtLink>

                    <button
                      type="button"
                      class="grid h-8 w-8 shrink-0 place-items-center border-0 bg-transparent text-2xl font-black leading-none text-[var(--color-text)]/65 outline-none transition hover:bg-transparent hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                      :title="isAnimeSaved(item.id) ? 'Remove from watchlist' : 'Add to watchlist'"
                      :aria-label="
                        isAnimeSaved(item.id)
                          ? `Remove ${getTrendingTitle(item)} from watchlist`
                          : `Add ${getTrendingTitle(item)} to watchlist`
                      "
                      @click="toggleTrendingSaved(item)"
                    >
                      {{ isAnimeSaved(item.id) ? '-' : '+' }}
                    </button>
                  </div>
                </NAnimeHoverCard>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.watch-breadcrumb ol {
  list-style: none;
  scrollbar-width: none;
}

.watch-breadcrumb ol::-webkit-scrollbar {
  display: none;
}
</style>
