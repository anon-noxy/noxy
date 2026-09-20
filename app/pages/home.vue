<script setup lang="ts">
type SpotlightAnime = {
  id: number
  title: string
  japaneseTitle: string
  banner: string
  image: string
  color?: string
  description?: string
  type: string
  genres: string[]
  releaseDate: string
  quality: string
  sub: number
  dub: number
}

type TrendingAnime = {
  id: number
  title: string
  romajiTitle: string
  image: string
  color?: string
}

type HomeListAnime = {
  id: number
  title: string
  romajiTitle: string
  type: string
  date: string
  episodes: number
  sub: number
  dub: number
  image: string
  color?: string
  views?: number
  favorites?: number
}

type HomeListsResponse = {
  newAdded: HomeListAnime[]
  upcoming: HomeListAnime[]
  mostPopular: HomeListAnime[]
  mostViewed: {
    day: HomeListAnime[]
    week: HomeListAnime[]
    month: HomeListAnime[]
  }
  mostFavorite: HomeListAnime[]
  completed: HomeListAnime[]
}

type DiscoverAnime = {
  id: number
  title: string
  romajiTitle: string
  type: string
  date: string
  episodes: number
  image: string
  color?: string
}

type HomeDiscoverResponse = {
  youMayAlsoWatch: DiscoverAnime[]
  genres: string[]
}

type ScheduleAnime = {
  id: number
  animeId: number
  title: string
  romajiTitle: string
  episode: number
  airingAt: number
  type: string
}

type PreferenceAnimeDetails = {
  title?: {
    english?: string
    romaji?: string
    userPreferred?: string
    native?: string
  }
}

type PreferenceAnimeTitle = {
  englishTitle?: string
  romajiTitle?: string
}

type WatchlistEpisodeDetails = {
  status?: string
  episodes?: number
  nextAiringEpisode?: {
    episode?: number
  }
  streamingEpisodes?: Array<{
    title?: string
    url?: string
  }>
}

type UpNextKind = 'new-episode' | 'plan' | 'recommended'

type UpNextItem = {
  key: string
  kind: UpNextKind
  id: number
  title: string
  image: string
  to: string
  badge: string
  meta: string
  reason: string
  actionLabel: string
  progress?: number
  color?: string
}

const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))
const userPreferences = useUserPreferencesStore()
const { continueWatching, defaultWatchLanguage, watchedEpisodes, watchlist } = storeToRefs(userPreferences)
const { cleanAnimeInlineDescription } = useAnimeFormatters()
const activeMostViewedRange = ref('Day')
const areAllGenresShown = ref(false)
const selectedScheduleDate = ref('')
const currentTime = ref(new Date())
const scheduleStartDateKey = ref(toDateKey(new Date()))
const activeSpotlightIndex = ref(0)
const isSpotlightDragging = ref(false)
const spotlightDragOffset = ref(0)
const isScheduleReady = ref(false)
const trendingScroller = ref<HTMLElement | null>(null)
const continueWatchingScroller = ref<HTMLElement | null>(null)
const upNextScroller = ref<HTMLElement | null>(null)
const scheduleDaysScroller = ref<HTMLElement | null>(null)
const preferenceAnimeTitles = ref<Record<number, PreferenceAnimeTitle>>({})
const watchlistEpisodeTotals = ref<Record<number, number>>({})
const hasTrendingOverflow = ref(false)
const hasContinueWatchingOverflow = ref(false)
const hasUpNextOverflow = ref(false)
let spotlightDragStartX = 0
let shouldSuppressSpotlightClick = false
let spotlightTimer: number | null = null
let carouselNavigationFrame: number | null = null
let watchlistEpisodeTotalsRequestId = 0

const preloadedAnimeImages = new Set<string>()

const upNextItemLimit = 5
const watchlistEpisodeDetailsLimit = 24
const mostViewedRanges = ['Day', 'Week', 'Month']
const genreTextColors = [
  '#d0e9a4', // Lime
  '#f5b5dc', // Pink
  '#ff8274', // Coral
  '#d0a8d8', // Mauve
  '#a8cad9', // Blue
  '#dfb0a6', // Peach
  '#7edbc8', // Teal
] as const

const currentYear = new Date().getUTCFullYear()
const homeListsCacheVersion = `completed-tv-${currentYear}-v7`

const { data, pending: spotlightPending } = await useFetch<SpotlightAnime[]>('/api/myanimelist/spotlight', {
  default: () => [],
  lazy: true,
})

const { data: trendingData, pending: trendingPending } = await useFetch<TrendingAnime[]>('/api/myanimelist/trending', {
  default: () => [],
  lazy: true,
})

const {
  data: homeListsData,
  pending: homeListsPending,
  refresh: refreshHomeLists,
} = await useFetch<HomeListsResponse>('/api/myanimelist/home-lists', {
  key: `home-lists-${homeListsCacheVersion}`,
  query: {
    year: currentYear,
    v: homeListsCacheVersion,
  },
  getCachedData: (key, nuxtApp) => (nuxtApp.isHydrating ? nuxtApp.payload.data[key] : undefined),
  default: () => ({
    newAdded: [],
    upcoming: [],
    mostPopular: [],
    mostViewed: {
      day: [],
      week: [],
      month: [],
    },
    mostFavorite: [],
    completed: [],
  }),
  lazy: true,
})

const preferenceAnimeIds = computed(() => {
  const recentWatchedIds = Array.from(new Set(watchedEpisodes.value.slice(0, 12).map((entry) => entry.id)))

  return [
    ...continueWatching.value.flatMap((entry) => [entry.id, entry.id, entry.id]),
    ...watchlist.value.flatMap((anime) => [anime.id, anime.id]),
    ...recentWatchedIds,
  ].slice(0, 16)
})

const preferenceAnimeIdQuery = computed(() => preferenceAnimeIds.value.join(','))

const { data: homeDiscoverData, pending: homeDiscoverPending } = await useFetch<HomeDiscoverResponse>(
  '/api/myanimelist/home-discover',
  {
    query: {
      preferenceIds: preferenceAnimeIdQuery,
    },
    default: () => ({
      youMayAlsoWatch: [],
      genres: [],
    }),
    lazy: true,
    watch: [preferenceAnimeIdQuery],
  },
)

const { data: scheduleData, pending: schedulePending } = await useFetch<ScheduleAnime[]>('/api/myanimelist/schedule', {
  default: () => [],
  lazy: true,
})

const categoryTo = (slug: string) => `/category/${slug}`

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date)

  nextDate.setDate(nextDate.getDate() + days)

  return nextDate
}

const dateFromKey = (dateKey: string) => {
  const [year = '0', month = '1', day = '1'] = dateKey.split('-')

  return new Date(Number(year), Number(month) - 1, Number(day))
}

const preloadAnimeImage = (image?: string) => {
  if (!import.meta.client || !image || preloadedAnimeImages.has(image)) return

  preloadedAnimeImages.add(image)

  const preloader = new Image()

  preloader.decoding = 'async'
  preloader.src = image
}

const prefetchAnimePage = (animeId: number, image?: string) => {
  if (!import.meta.client) return

  preloadAnimeImage(image)
  preloadRouteComponents(`/anime/${animeId}`).catch(() => {})
}

const spotlightAnimes = computed(() => data.value || [])
const spotlightTrackStyle = computed(() => ({
  transform: `translate3d(calc(${-activeSpotlightIndex.value * 100}% + ${spotlightDragOffset.value}px), 0, 0)`,
  transition: isSpotlightDragging.value ? 'none' : 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
}))
const trendingAnimes = computed(() => {
  const spotlightIds = new Set(spotlightAnimes.value.map((anime) => anime.id))
  const animes = trendingData.value || []
  const uniqueTrendingAnimes = animes.filter((anime) => !spotlightIds.has(anime.id))
  const trendingById = new Map<number, TrendingAnime>()

  for (const anime of [...uniqueTrendingAnimes, ...animes]) {
    if (trendingById.size >= 12) break

    trendingById.set(anime.id, anime)
  }

  return Array.from(trendingById.values())
})
const hasTrendingNavigation = computed(() => trendingAnimes.value.length > 1 && hasTrendingOverflow.value)
const homeListSections = computed(() => [
  { title: 'Recommended', items: homeListsData.value?.newAdded || [], viewMoreTo: categoryTo('you-may-also-watch') },
  { title: 'Most Popular', items: homeListsData.value?.mostPopular || [], viewMoreTo: categoryTo('most-popular') },
  { title: 'Most Favorite', items: homeListsData.value?.mostFavorite || [], viewMoreTo: categoryTo('most-favorite') },
  {
    title: `Completed in ${currentYear}`,
    items: homeListsData.value?.completed || [],
    viewMoreTo: categoryTo('completed'),
  },
])
const mostViewedAnimes = computed(() => {
  const rangeKey = activeMostViewedRange.value.toLowerCase() as 'day' | 'week' | 'month'

  return homeListsData.value?.mostViewed?.[rangeKey] || []
})
const continueWatchingItems = computed(() => {
  const latestByAnime = new Map<number, (typeof continueWatching.value)[number]>()

  for (const entry of continueWatching.value) {
    if (!latestByAnime.has(entry.id)) {
      latestByAnime.set(entry.id, entry)
    }
  }

  return Array.from(latestByAnime.values())
    .slice(0, 12)
    .map((entry) => ({
      ...entry,
      progress: entry.progress || 0,
      to: `/watch/${entry.id}?episode=${entry.episode}&language=${entry.language}`,
    }))
})
const continueWatchingDesktopColumns = computed(() => {
  return Math.max(1, Math.min(3, continueWatchingItems.value.length))
})
const continueWatchingDesktopCardWidth = computed(() => {
  const columns = continueWatchingDesktopColumns.value
  const totalGapWidth = (columns - 1) * 0.75

  return `calc((100% - ${totalGapWidth}rem) / ${columns})`
})
const watchlistEpisodeDetailsIds = computed(() => {
  return Array.from(new Set(watchlist.value.filter((anime) => anime.status !== 'completed').map((anime) => anime.id)))
    .slice(0, watchlistEpisodeDetailsLimit)
    .sort((left, right) => left - right)
})
const hasContinueWatchingNavigation = computed(
  () => continueWatchingItems.value.length > 1 && hasContinueWatchingOverflow.value,
)
const youMayAlsoWatchAnimes = computed(() => homeDiscoverData.value?.youMayAlsoWatch || [])
const upcomingAnimes = computed(() => homeListsData.value?.upcoming || [])
const visibleGenres = computed(() => {
  const genres = homeDiscoverData.value?.genres || []

  return areAllGenresShown.value ? genres : genres.slice(0, 30)
})
const getGenreTextStyle = (index: number): Record<string, string> => ({
  color: genreTextColors[index % genreTextColors.length] ?? genreTextColors[0],
})
const scheduleDays = computed(() => {
  const startDate = dateFromKey(scheduleStartDateKey.value)

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startDate, index)

    return {
      key: toDateKey(date),
      date,
    }
  })
})
const selectedScheduleDay = computed(() => {
  return scheduleDays.value.find((day) => day.key === selectedScheduleDate.value) || scheduleDays.value[0]
})
const scheduleForSelectedDay = computed(() => {
  const selectedKey = selectedScheduleDay.value?.key

  return (scheduleData.value || []).filter((anime) => {
    return toDateKey(new Date(anime.airingAt * 1000)) === selectedKey
  })
})
const timezoneLabel = computed(() => {
  if (!import.meta.client) return ''

  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'
})
const formattedCurrentTime = computed(() => {
  return new Intl.DateTimeFormat('en', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(currentTime.value)
})

const formatCompactStat = (value?: number) => {
  if (!value) return '0'

  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

const formatProgressLabel = (progress?: number) => {
  if (!progress) return 'Started'

  return progress >= 90 ? 'Almost done' : `${progress}% watched`
}

const getPreferenceAnimeTitle = (anime: { id: number; title: string; englishTitle?: string; romajiTitle?: string }) => {
  const cachedTitle = preferenceAnimeTitles.value[anime.id] || {}
  const englishTitle = anime.englishTitle || cachedTitle.englishTitle
  const romajiTitle = anime.romajiTitle || cachedTitle.romajiTitle

  if (selectedLanguage.value === 'RO') {
    return romajiTitle || anime.title
  }

  return englishTitle || anime.title
}

const getAnimeCardTitle = (anime: { title: string; romajiTitle?: string }) => {
  return selectedLanguage.value === 'EN' ? anime.title : anime.romajiTitle || anime.title
}

const getWatchlistEpisodeTotal = (anime: (typeof watchlist.value)[number]) => {
  return watchlistEpisodeTotals.value[anime.id] || anime.episodes
}

const getWatchlistProgressForHome = (anime: (typeof watchlist.value)[number]) => {
  return userPreferences.getWatchlistProgress(anime.id, getWatchlistEpisodeTotal(anime))
}

const watchEpisodeTo = (animeId: number, episode = 1) => {
  return `/watch/${animeId}?episode=${episode}&language=${defaultWatchLanguage.value}`
}

const formatEpisodeMeta = (episode: number, language = defaultWatchLanguage.value) => {
  return `Episode ${episode} • ${language.toUpperCase()}`
}

const formatUnwatchedEpisodeReason = (count: number) => {
  return `${count} unwatched ${count === 1 ? 'episode' : 'episodes'} available`
}

const upNextItems = computed<UpNextItem[]>(() => {
  const items: UpNextItem[] = []
  const usedIds = new Set(continueWatchingItems.value.map((item) => item.id))
  const savedAnimeIds = new Set(watchlist.value.map((anime) => anime.id))
  const addItem = (item: UpNextItem) => {
    if (items.length >= upNextItemLimit || usedIds.has(item.id)) return

    usedIds.add(item.id)
    items.push(item)
  }

  const nextEpisodeCandidate = watchlist.value
    .filter((anime) => anime.status !== 'completed' && !usedIds.has(anime.id))
    .map((anime) => ({
      anime,
      progress: getWatchlistProgressForHome(anime),
    }))
    .filter(({ progress }) => {
      return Boolean(
        progress.watched > 0 && progress.total && progress.nextEpisode && progress.nextEpisode <= progress.total,
      )
    })
    .sort((left, right) => {
      return right.anime.updatedAt - left.anime.updatedAt || left.progress.nextEpisode - right.progress.nextEpisode
    })[0]

  if (nextEpisodeCandidate?.progress.nextEpisode) {
    addItem({
      key: `new-episode-${nextEpisodeCandidate.anime.id}`,
      kind: 'new-episode',
      id: nextEpisodeCandidate.anime.id,
      title: getPreferenceAnimeTitle(nextEpisodeCandidate.anime),
      image: nextEpisodeCandidate.anime.image,
      to: watchEpisodeTo(nextEpisodeCandidate.anime.id, nextEpisodeCandidate.progress.nextEpisode),
      badge: 'Next episode',
      meta: formatEpisodeMeta(nextEpisodeCandidate.progress.nextEpisode),
      reason: formatUnwatchedEpisodeReason(nextEpisodeCandidate.progress.total - nextEpisodeCandidate.progress.watched),
      actionLabel: `Watch ep ${nextEpisodeCandidate.progress.nextEpisode}`,
      progress: nextEpisodeCandidate.progress.percent,
    })
  }

  const planCandidate = watchlist.value.find((anime) => anime.status === 'plan-to-watch' && !usedIds.has(anime.id))

  if (planCandidate) {
    const progress = getWatchlistProgressForHome(planCandidate)
    const firstEpisode = progress.nextEpisode || 1

    addItem({
      key: `plan-${planCandidate.id}`,
      kind: 'plan',
      id: planCandidate.id,
      title: getPreferenceAnimeTitle(planCandidate),
      image: planCandidate.image,
      to: watchEpisodeTo(planCandidate.id, firstEpisode),
      badge: 'From watchlist',
      meta: formatEpisodeMeta(firstEpisode),
      reason: progress.total ? `${progress.total} episodes ready` : 'Saved for later',
      actionLabel: 'Start watching',
      progress: progress.percent,
    })
  }

  const recommendationReason = preferenceAnimeIds.value.length
    ? 'Based on your watchlist and history'
    : 'A strong pick to start with'

  for (const anime of youMayAlsoWatchAnimes.value) {
    addItem({
      key: `recommended-${anime.id}`,
      kind: 'recommended',
      id: anime.id,
      title: getAnimeCardTitle(anime),
      image: anime.image,
      to: `/anime/${anime.id}`,
      badge: savedAnimeIds.has(anime.id) ? 'Saved pick' : 'Recommended',
      meta: [anime.type, anime.date || 'TBA'].filter(Boolean).join(' • '),
      reason: recommendationReason,
      actionLabel: 'View details',
      color: anime.color,
    })
  }

  return items
})
const upNextDesktopColumns = computed(() => {
  const maximumColumns = continueWatchingItems.value.length ? 2 : 5

  return Math.max(1, Math.min(maximumColumns, upNextItems.value.length))
})
const upNextDesktopCardWidth = computed(() => {
  const columns = upNextDesktopColumns.value
  const totalGapWidth = (columns - 1) * 0.75

  return `calc((100% - ${totalGapWidth}rem) / ${columns})`
})
const hasUpNextNavigation = computed(() => upNextItems.value.length > 1 && hasUpNextOverflow.value)
const hasHomeInitialContent = computed(() => {
  return Boolean(
    spotlightAnimes.value.length ||
    trendingAnimes.value.length ||
    upNextItems.value.length ||
    continueWatchingItems.value.length ||
    homeListSections.value.some((section) => section.items.length) ||
    youMayAlsoWatchAnimes.value.length ||
    upcomingAnimes.value.length ||
    scheduleData.value?.length,
  )
})
const isHomePageLoading = computed(() => {
  return (
    !hasHomeInitialContent.value &&
    (spotlightPending.value ||
      trendingPending.value ||
      homeListsPending.value ||
      homeDiscoverPending.value ||
      schedulePending.value)
  )
})

const preferenceTitleIds = computed(() => {
  return Array.from(
    new Set([
      ...continueWatching.value.slice(0, 12).map((anime) => anime.id),
      ...watchlist.value.slice(0, 12).map((anime) => anime.id),
    ]),
  ).slice(0, 16)
})

const loadPreferenceAnimeTitles = async (animeIds: number[]) => {
  if (!import.meta.client) return

  const missingIds = animeIds.filter((animeId) => {
    const title = preferenceAnimeTitles.value[animeId]

    return !title?.englishTitle || !title?.romajiTitle
  })

  if (!missingIds.length) return

  const titleEntries = await Promise.all(
    missingIds.map(async (animeId) => {
      try {
        const details = await $fetch<PreferenceAnimeDetails>(`/api/myanimelist/${animeId}`)
        const englishTitle = details.title?.english || details.title?.userPreferred || details.title?.romaji || ''
        const romajiTitle = details.title?.romaji || details.title?.userPreferred || details.title?.english || ''

        return [animeId, { englishTitle, romajiTitle }] as const
      } catch {
        return [animeId, undefined] as const
      }
    }),
  )

  const nextTitles = titleEntries.reduce<Record<number, PreferenceAnimeTitle>>((titles, [animeId, title]) => {
    if (title) {
      titles[animeId] = title
    }

    return titles
  }, {})

  preferenceAnimeTitles.value = {
    ...preferenceAnimeTitles.value,
    ...nextTitles,
  }
}

const fetchWatchlistEpisodeTotals = async () => {
  if (!import.meta.client) return

  const requestId = ++watchlistEpisodeTotalsRequestId
  const animeIds = watchlistEpisodeDetailsIds.value

  if (!animeIds.length) {
    watchlistEpisodeTotals.value = {}
    return
  }

  const episodeTotals = await Promise.all(
    animeIds.map(async (animeId) => {
      try {
        const details = await $fetch<WatchlistEpisodeDetails>(`/api/myanimelist/${animeId}`)

        return [animeId, getAvailableEpisodeNumbers(details).length] as const
      } catch {
        return [animeId, 0] as const
      }
    }),
  )

  if (requestId !== watchlistEpisodeTotalsRequestId) return

  watchlistEpisodeTotals.value = episodeTotals.reduce<Record<number, number>>((totals, [animeId, episodeCount]) => {
    if (episodeCount > 0) {
      totals[animeId] = episodeCount
    }

    return totals
  }, {})
}

watch(preferenceTitleIds, (animeIds) => loadPreferenceAnimeTitles(animeIds), { immediate: true })
watch(
  watchlistEpisodeDetailsIds,
  () => {
    void fetchWatchlistEpisodeTotals()
  },
  { immediate: true },
)

const { resume: resumeWatchlistEpisodeTotalsRefresh, pause: pauseWatchlistEpisodeTotalsRefresh } = useIntervalFn(
  () => {
    void fetchWatchlistEpisodeTotals()
  },
  5 * 60 * 1000,
  { immediate: false },
)

useEventListener(import.meta.client ? window : null, 'focus', fetchWatchlistEpisodeTotals)

const selectAdjacentScheduleDay = (direction: -1 | 1) => {
  const currentIndex = scheduleDays.value.findIndex((day) => day.key === selectedScheduleDate.value)
  const fallbackIndex = direction > 0 ? 0 : scheduleDays.value.length - 1
  const nextIndex = Math.min(
    scheduleDays.value.length - 1,
    Math.max(0, (currentIndex >= 0 ? currentIndex : fallbackIndex) + direction),
  )

  setSelectedScheduleDay(scheduleDays.value[nextIndex]?.key || selectedScheduleDate.value)
}

const scrollSelectedScheduleDayIntoView = () => {
  if (!import.meta.client || !scheduleDaysScroller.value || !selectedScheduleDate.value) return

  scheduleDaysScroller.value
    .querySelector<HTMLElement>(`[data-schedule-day="${selectedScheduleDate.value}"]`)
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
}

const setSelectedScheduleDay = (dayKey: string) => {
  selectedScheduleDate.value = dayKey
  nextTick(scrollSelectedScheduleDayIntoView)
}

const updateScheduleTime = () => {
  const now = new Date()

  currentTime.value = now
  scheduleStartDateKey.value = toDateKey(now)
}

const { resume: resumeScheduleTimer, pause: pauseScheduleTimer } = useIntervalFn(updateScheduleTime, 1000, {
  immediate: false,
})

const stopSpotlightTimer = () => {
  if (!spotlightTimer) return

  window.clearInterval(spotlightTimer)
  spotlightTimer = null
}

const startSpotlightTimer = () => {
  if (spotlightTimer || !import.meta.client) return

  spotlightTimer = window.setInterval(() => {
    selectSpotlightAnime(1, false)
  }, 5000)
}

const selectSpotlightAnime = (direction: -1 | 1, shouldRestartTimer = true) => {
  const total = spotlightAnimes.value.length

  if (!total) return

  activeSpotlightIndex.value = (activeSpotlightIndex.value + direction + total) % total

  if (shouldRestartTimer) {
    stopSpotlightTimer()
    startSpotlightTimer()
  }
}

const isSpotlightInteractiveTarget = (target: EventTarget | null) => {
  return target instanceof Element && Boolean(target.closest('a, button'))
}

const startSpotlightDrag = (event: PointerEvent) => {
  if (!event.isPrimary || spotlightAnimes.value.length < 2) return
  if (isSpotlightInteractiveTarget(event.target)) return

  spotlightDragStartX = event.clientX
  spotlightDragOffset.value = 0
  shouldSuppressSpotlightClick = false
  isSpotlightDragging.value = true
  stopSpotlightTimer()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const moveSpotlightDrag = (event: PointerEvent) => {
  if (!isSpotlightDragging.value || !event.isPrimary) return

  spotlightDragOffset.value = event.clientX - spotlightDragStartX

  if (Math.abs(spotlightDragOffset.value) > 8) {
    shouldSuppressSpotlightClick = true
  }
}

const endSpotlightDrag = (event: PointerEvent) => {
  if (!isSpotlightDragging.value || !event.isPrimary) return

  const dragOffset = spotlightDragOffset.value
  const target = event.currentTarget as HTMLElement
  const threshold = Math.min(Math.max(target.clientWidth * 0.14, 72), 180)

  isSpotlightDragging.value = false
  spotlightDragOffset.value = 0

  if (dragOffset <= -threshold) {
    selectSpotlightAnime(1, false)
  } else if (dragOffset >= threshold) {
    selectSpotlightAnime(-1, false)
  }

  startSpotlightTimer()
}

const cancelSpotlightClick = (event: MouseEvent) => {
  if (isSpotlightInteractiveTarget(event.target)) return
  if (!shouldSuppressSpotlightClick) return

  event.preventDefault()
  event.stopPropagation()
  shouldSuppressSpotlightClick = false
}

const hasCarouselOverflow = (scroller: HTMLElement | null) => {
  if (!import.meta.client || !scroller) return false

  const availableWidth = scroller.parentElement?.clientWidth || scroller.clientWidth

  return scroller.scrollWidth > availableWidth + 1
}

const updateCarouselNavigation = () => {
  hasTrendingOverflow.value = hasCarouselOverflow(trendingScroller.value)
  hasContinueWatchingOverflow.value = hasCarouselOverflow(continueWatchingScroller.value)
  hasUpNextOverflow.value = hasCarouselOverflow(upNextScroller.value)
}

const queueCarouselNavigationUpdate = () => {
  if (!import.meta.client) return

  if (carouselNavigationFrame) {
    window.cancelAnimationFrame(carouselNavigationFrame)
  }

  carouselNavigationFrame = window.requestAnimationFrame(() => {
    carouselNavigationFrame = null
    updateCarouselNavigation()
  })
}

useEventListener(import.meta.client ? window : null, 'resize', queueCarouselNavigationUpdate)

const scrollCarouselItem = (scroller: HTMLElement | null, direction: -1 | 1) => {
  const firstItem = scroller?.firstElementChild as HTMLElement | null

  if (!scroller || !firstItem) return

  const styles = window.getComputedStyle(scroller)
  const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0

  scroller.scrollBy({
    left: direction * (firstItem.offsetWidth + gap),
    behavior: 'smooth',
  })
}

watch(
  scheduleDays,
  (days) => {
    if (!selectedScheduleDate.value && days[0]) {
      selectedScheduleDate.value = days[0].key
    }
  },
  { immediate: true },
)

watch(spotlightAnimes, (animes) => {
  if (activeSpotlightIndex.value >= animes.length) {
    activeSpotlightIndex.value = 0
  }
})

watch(
  () => [trendingAnimes.value.length, continueWatchingItems.value.length, upNextItems.value.length],
  () => nextTick(queueCarouselNavigationUpdate),
  { flush: 'post' },
)

onMounted(() => {
  void refreshHomeLists({ dedupe: 'cancel' })
  updateScheduleTime()
  isScheduleReady.value = true

  startSpotlightTimer()
  nextTick(queueCarouselNavigationUpdate)
  resumeScheduleTimer()
  resumeWatchlistEpisodeTotalsRefresh()
})

onBeforeUnmount(() => {
  stopSpotlightTimer()
  pauseScheduleTimer()
  pauseWatchlistEpisodeTotalsRefresh()

  if (carouselNavigationFrame) {
    window.cancelAnimationFrame(carouselNavigationFrame)
  }
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)]">
    <template v-if="isHomePageLoading">
      <section class="relative animate-pulse">
        <div
          class="grid min-h-[640px] overflow-hidden bg-[var(--color-background)] md:h-[550px] md:min-h-0 md:grid-cols-[minmax(0,0.43fr)_minmax(0,0.57fr)] xl:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)]"
        >
          <div
            class="order-2 flex min-h-[350px] items-end bg-[var(--color-background)] px-6 pb-8 pt-14 md:order-1 md:min-h-0 md:px-8 md:py-10 lg:px-12"
          >
            <div class="w-full max-w-2xl">
              <div class="h-6 w-36 rounded bg-pink-300/25" />
              <div class="mt-5 h-11 w-4/5 rounded bg-[var(--color-background-soft)]" />
              <div class="mt-3 h-11 w-3/5 rounded bg-[var(--color-background-soft)]" />
              <div class="mt-6 flex flex-wrap gap-2">
                <div v-for="item in 5" :key="item" class="h-6 w-20 rounded-full bg-[var(--color-background-soft)]" />
              </div>
              <div class="mt-6 space-y-2">
                <div class="h-4 w-full max-w-xl rounded bg-[var(--color-background-soft)]" />
                <div class="h-4 w-11/12 max-w-xl rounded bg-[var(--color-background-soft)]" />
                <div class="h-4 w-2/3 max-w-xl rounded bg-[var(--color-background-soft)]" />
              </div>
              <div class="mt-7 flex gap-4">
                <div class="h-10 w-34 rounded-full bg-pink-300/35" />
                <div class="h-10 w-28 rounded-full bg-[var(--color-background-soft)]" />
              </div>
            </div>
          </div>

          <div class="relative order-1 min-h-[290px] overflow-hidden bg-[var(--color-background-soft)] md:order-2">
            <div class="absolute inset-0 bg-[var(--color-background-soft)]" />
            <div class="absolute inset-0 bg-black/20" />
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--color-border)] px-4 py-7 sm:px-6 lg:px-8">
        <div class="mb-4 h-8 w-36 animate-pulse rounded bg-pink-300/25" />
        <div class="flex gap-4 overflow-hidden md:gap-5">
          <div
            v-for="item in 6"
            :key="item"
            class="grid h-90 w-[78%] shrink-0 animate-pulse grid-cols-[28px_minmax(0,1fr)] gap-2 min-[480px]:w-[52%] md:w-[37%] lg:w-[26%] xl:w-[19%] 2xl:w-[15.5%]"
          >
            <div class="grid grid-rows-[minmax(0,1fr)_auto]">
              <div class="h-full rounded bg-[var(--color-background-soft)]" />
              <div class="mt-3 h-7 rounded bg-pink-300/25" />
            </div>
            <div class="bg-[var(--color-background-soft)]" />
          </div>
        </div>
      </section>

      <section
        class="grid gap-7 border-t border-[var(--color-border)] px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8 2xl:grid-cols-4"
      >
        <div v-for="section in 4" :key="section" class="min-w-0 animate-pulse">
          <div class="mb-5 h-8 w-40 rounded bg-pink-300/25" />
          <div class="divide-y divide-[var(--color-border)]">
            <div v-for="item in 5" :key="item" class="flex min-h-24 gap-4 py-4">
              <div class="h-17 w-14 shrink-0 rounded bg-[var(--color-background-soft)]" />
              <div class="min-w-0 flex-1 pt-1">
                <div class="h-4 w-full rounded bg-[var(--color-background-soft)]" />
                <div class="mt-2 h-4 w-2/3 rounded bg-[var(--color-background-soft)]" />
                <div class="mt-3 h-3 w-28 rounded bg-[var(--color-background-soft)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        class="grid gap-8 border-t border-[var(--color-border)] px-4 py-8 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_380px]"
      >
        <div class="min-w-0 animate-pulse">
          <div class="mb-5 h-8 w-56 rounded bg-pink-300/25" />
          <div class="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 2xl:grid-cols-6">
            <div v-for="item in 12" :key="item">
              <div class="aspect-[3/4] bg-[var(--color-background-soft)]" />
              <div class="mt-3 h-4 rounded bg-[var(--color-background-soft)]" />
              <div class="mt-2 h-3 w-24 rounded bg-[var(--color-background-soft)]" />
            </div>
          </div>
        </div>

        <aside class="min-w-0 animate-pulse">
          <div class="mb-5 h-8 w-28 rounded bg-pink-300/25" />
          <div class="grid grid-cols-2 gap-x-8 gap-y-5 bg-[var(--color-background-soft)] p-6 sm:grid-cols-3">
            <div v-for="item in 18" :key="item" class="h-4 rounded bg-[var(--color-background-mute)]" />
          </div>
        </aside>
      </section>
    </template>

    <template v-else>
      <section v-if="spotlightAnimes.length" class="relative">
        <div
          class="relative min-h-[640px] touch-pan-y overflow-hidden bg-[var(--color-background)] md:h-[550px] md:min-h-0"
          @click.capture="cancelSpotlightClick"
          @pointercancel="endSpotlightDrag"
          @pointerdown="startSpotlightDrag"
          @pointerleave="endSpotlightDrag"
          @pointermove="moveSpotlightDrag"
          @pointerup="endSpotlightDrag"
        >
          <div class="flex h-full cursor-grab select-none active:cursor-grabbing" :style="spotlightTrackStyle">
            <div
              v-for="(anime, index) in spotlightAnimes"
              :key="anime.id"
              class="grid min-w-full md:grid-cols-[minmax(0,0.43fr)_minmax(0,0.57fr)] xl:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]"
            >
              <div
                class="spotlight-copy-panel relative z-10 order-2 flex min-h-[350px] items-end bg-[var(--color-background)] px-6 pb-8 pt-14 text-white md:order-1 md:min-h-0 md:px-8 md:py-10 lg:px-12"
              >
                <div class="relative z-10 max-w-2xl">
                  <h1 class="text-xl font-semibold text-pink-300">#{{ index + 1 }} Spotlight</h1>

                  <NTitleTransition
                    as="h2"
                    :text="selectedLanguage === 'EN' ? anime.title : anime.japaneseTitle"
                    :transition-key="`${selectedLanguage}-${anime.id}`"
                    class="my-4 line-clamp-2 text-3xl font-bold sm:text-4xl"
                  />

                  <div class="mt-4 flex flex-wrap items-center gap-2 text-sm">
                    <span class="flex items-center">
                      <i class="i-material-symbols-play-circle mr-1 text-lg" />
                      {{ anime.type }}
                    </span>

                    <span v-if="anime.genres?.[0]" class="flex items-center">
                      <i class="i-material-symbols-schedule mr-1 text-lg" />
                      {{ anime.genres[0] }}
                    </span>

                    <span v-if="anime.releaseDate" class="flex items-center">
                      <i class="i-material-symbols-calendar-today mr-1 text-lg" />
                      {{ anime.releaseDate }}
                    </span>

                    <span v-if="anime.quality" class="rounded bg-pink-300 px-1 text-xs font-semibold text-black">
                      {{ anime.quality }}
                    </span>

                    <div class="flex items-center">
                      <span
                        class="flex items-center rounded-l border-r border-black bg-green-300 px-1 text-xs text-black"
                      >
                        <div i-material-symbols-closed-caption />
                        {{ anime.sub }}
                      </span>
                      <span
                        class="flex items-center rounded-r border-l border-black bg-teal-200 px-1 text-xs text-black"
                      >
                        <div i-mdi-microphone />
                        {{ anime.dub }}
                      </span>
                    </div>
                  </div>

                  <p
                    v-if="cleanAnimeInlineDescription(anime.description)"
                    class="mt-5 line-clamp-3 max-w-xl text-sm leading-6 text-white/75"
                    :title="cleanAnimeInlineDescription(anime.description)"
                  >
                    {{ cleanAnimeInlineDescription(anime.description) }}
                  </p>

                  <div class="mt-6 flex flex-wrap gap-4">
                    <NuxtLink
                      :to="`/watch/${anime.id}?episode=1&language=${defaultWatchLanguage}`"
                      class="flex items-center gap-1 rounded-full bg-pink-300 px-4 py-2 font-semibold text-black no-underline transition hover:opacity-85"
                    >
                      <div i-material-symbols-play-circle class="text-lg" />
                      <span>Watch Now</span>
                    </NuxtLink>

                    <NuxtLink
                      :to="`/anime/${anime.id}`"
                      class="flex items-center gap-1 rounded-full bg-gray-600 px-4 py-2 font-semibold text-white no-underline transition hover:bg-[var(--vt-c-black-mute)]"
                      @focus="prefetchAnimePage(anime.id, anime.banner || anime.image)"
                      @pointerenter="prefetchAnimePage(anime.id, anime.banner || anime.image)"
                    >
                      <span>Details</span>
                      <div i-ci-caret-right-sm class="text-2xl" />
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <div
                class="relative order-1 min-h-[290px] overflow-hidden bg-[var(--color-background-soft)] md:order-2 md:min-h-0"
              >
                <NRemoteImage
                  v-if="anime.banner || anime.image"
                  :src="anime.banner || anime.image"
                  :fallback-src="anime.image"
                  :alt="selectedLanguage === 'EN' ? anime.title : anime.japaneseTitle"
                  :placeholder-color="anime.color"
                  class="absolute inset-0 h-full w-full object-cover object-center"
                  width="2560"
                  height="1440"
                  :loading="index === activeSpotlightIndex ? 'eager' : 'lazy'"
                  draggable="false"
                />
                <div
                  class="pointer-events-none absolute inset-0 bg-black/25 shadow-[inset_0_0_160px_rgba(0,0,0,0.7)]"
                />
                <div
                  class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--color-background)] to-transparent md:hidden"
                />
                <div
                  class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--color-background)]/80 to-transparent"
                />
                <div
                  class="pointer-events-none absolute inset-x-0 bottom-0 hidden h-28 bg-gradient-to-t from-[var(--color-background)]/85 to-transparent md:block"
                />
                <div
                  class="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-[var(--color-background)]/70 to-transparent"
                />
                <div
                  class="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--color-background)]/85 to-transparent md:hidden"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="absolute bottom-5 right-5 z-10 hidden h-24 w-9 flex-col gap-3 md:flex">
          <button
            type="button"
            class="spotlight-next flex flex-1 items-center justify-center rounded-lg border-0 bg-[var(--color-background-mute)] text-white transition hover:text-pink-300"
            aria-label="Next spotlight anime"
            @click="selectSpotlightAnime(1)"
          >
            <div i-ci-caret-right-sm class="text-3xl" />
          </button>
          <button
            type="button"
            class="spotlight-prev flex flex-1 items-center justify-center rounded-lg border-0 bg-[var(--color-background-mute)] text-white transition hover:text-pink-300"
            aria-label="Previous spotlight anime"
            @click="selectSpotlightAnime(-1)"
          >
            <div i-ci-caret-left-sm class="text-3xl" />
          </button>
        </div>
      </section>

      <section
        v-if="trendingAnimes.length"
        class="relative border-t border-[var(--color-border)] px-4 py-7 sm:px-6 lg:px-8"
      >
        <div class="mb-4 flex items-center justify-between gap-4">
          <h2 class="text-xl font-extrabold tracking-wide text-pink-300 sm:text-2xl">Trending</h2>

          <NuxtLink
            :to="categoryTo('trending')"
            class="hidden items-center gap-1 text-sm font-semibold text-[var(--color-text)]/80 no-underline transition hover:text-pink-300 sm:flex"
          >
            <span>View more</span>
            <div i-ci-caret-right-sm class="text-xl" />
          </NuxtLink>
        </div>

        <div class="relative pr-0" :class="hasTrendingNavigation ? 'pr-12' : ''">
          <div ref="trendingScroller" class="flex gap-4 overflow-hidden scroll-smooth pb-1 md:gap-5">
            <div
              v-for="(anime, index) in trendingAnimes"
              :key="anime.id"
              class="w-[78%] shrink-0 min-[480px]:w-[52%] md:w-[37%] lg:w-[26%] xl:w-[19%] 2xl:w-[15.5%]"
            >
              <NAnimeHoverCard :anime-id="anime.id">
                <NuxtLink
                  :to="`/anime/${anime.id}`"
                  class="group grid h-90 grid-cols-[28px_minmax(0,1fr)] gap-2 overflow-hidden text-[var(--color-text)] no-underline"
                  @focus="prefetchAnimePage(anime.id, anime.image)"
                  @pointerenter="prefetchAnimePage(anime.id, anime.image)"
                >
                  <div class="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
                    <NTitleTransition
                      as="p"
                      :text="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                      :transition-key="`${selectedLanguage}-${anime.id}`"
                      class="[writing-mode:vertical-rl] h-full rotate-180 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold leading-none text-white"
                    />
                    <p class="mt-3 shrink-0 text-2xl font-extrabold leading-none text-pink-300">
                      {{ String(index + 1).padStart(2, '0') }}
                    </p>
                  </div>

                  <div class="relative overflow-hidden bg-[var(--color-background-soft)]">
                    <NRemoteImage
                      :src="anime.image"
                      :alt="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                      :placeholder-color="anime.color"
                      class="h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
                      :loading="index < 6 ? 'eager' : 'lazy'"
                      :fetchpriority="index < 4 ? 'high' : 'auto'"
                    />
                    <div class="absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
                  </div>
                </NuxtLink>
              </NAnimeHoverCard>
            </div>
          </div>

          <div v-if="hasTrendingNavigation" class="absolute bottom-0 right-0 top-0 z-10 flex w-9 flex-col gap-3">
            <button
              type="button"
              class="trending-next flex flex-1 items-center justify-center rounded-lg border-0 bg-[var(--color-background-mute)] text-white transition hover:text-pink-300"
              aria-label="Next trending anime"
              @click="scrollCarouselItem(trendingScroller, 1)"
            >
              <div i-ci-caret-right-sm class="text-3xl" />
            </button>
            <button
              type="button"
              class="trending-prev flex flex-1 items-center justify-center rounded-lg border-0 bg-[var(--color-background-mute)] text-white transition hover:text-pink-300"
              aria-label="Previous trending anime"
              @click="scrollCarouselItem(trendingScroller, -1)"
            >
              <div i-ci-caret-left-sm class="text-3xl" />
            </button>
          </div>
        </div>
      </section>

      <section class="border-t border-[var(--color-border)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div class="flex items-center gap-4 sm:gap-5">
          <NRemoteImage
            src="/images/noxy-luffy.gif"
            alt="Noxy Luffy"
            class="hidden h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-pink-300/20 md:block md:h-18 md:w-18"
            width="128"
            height="128"
            loading="lazy"
          />
          <div>
            <h2 class="text-sm font-extrabold text-pink-300 sm:text-base">Share Noxy</h2>
            <p class="mt-1 text-sm font-medium text-[var(--color-text)]/80 sm:text-base">to your friends</p>
          </div>
        </div>
      </section>

      <section
        v-if="continueWatchingItems.length || upNextItems.length"
        class="personal-feed-section relative overflow-visible border-t border-[var(--color-border)] bg-[var(--color-background-mute)]"
      >
        <div
          class="relative z-[1] grid min-h-[360px] lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]"
        >
          <div class="relative z-10 hidden min-h-full overflow-visible lg:block">
            <NRemoteImage
              src="/images/noxy-sagiri.png"
              alt="Sagiri with a doll"
              class="sagiri-artwork pointer-events-none absolute bottom-0 left-0 h-[370px] w-auto max-w-none object-contain xl:h-[410px]"
              width="601"
              height="601"
              loading="lazy"
            />
          </div>

          <div class="min-w-0 px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div
              class="grid gap-8"
              :class="continueWatchingItems.length && upNextItems.length ? '2xl:grid-cols-2' : ''"
            >
              <div v-if="continueWatchingItems.length" class="min-w-0">
                <div class="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-3">
                      <h2 class="text-xl font-extrabold tracking-wide text-pink-300 sm:text-2xl">Continue Watching</h2>
                      <span
                        class="rounded-full border border-pink-300/20 bg-pink-300/10 px-2 py-0.5 text-xs font-black text-pink-200"
                      >
                        {{ continueWatchingItems.length }}
                      </span>
                    </div>
                    <p class="mt-1 hidden text-sm font-medium text-[var(--color-text)]/55 sm:block">
                      Jump back in where you left off.
                    </p>
                  </div>
                </div>

                <div class="relative pr-0" :class="hasContinueWatchingNavigation ? 'pr-12' : ''">
                  <div
                    ref="continueWatchingScroller"
                    class="continue-watching-grid flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 sm:overflow-hidden"
                    :style="{
                      '--continue-watching-card-width': continueWatchingDesktopCardWidth,
                    }"
                  >
                    <div
                      v-for="item in continueWatchingItems"
                      :key="`${item.id}-${item.episode}-${item.language}`"
                      class="shrink-0 snap-start min-[520px]:w-[410px] md:w-[390px] xl:w-auto"
                      :class="hasContinueWatchingNavigation ? 'w-[calc(100vw-5rem)]' : 'w-[calc(100vw-2rem)]'"
                    >
                      <NAnimeHoverCard :anime-id="item.id">
                        <NuxtLink
                          :to="item.to"
                          class="group grid h-[118px] w-full grid-cols-[78px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/70 text-[var(--color-text)] no-underline transition hover:-translate-y-0.5 hover:border-pink-300/40 hover:bg-[var(--color-background-mute)]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                          @focus="prefetchAnimePage(item.id, item.image)"
                          @pointerenter="prefetchAnimePage(item.id, item.image)"
                        >
                          <div class="relative h-[118px] overflow-hidden bg-[var(--color-background-mute)]">
                            <NRemoteImage
                              v-if="item.image"
                              :src="item.image"
                              :alt="getPreferenceAnimeTitle(item)"
                              class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div v-else class="grid h-full w-full place-items-center text-pink-300">
                              <div i-material-symbols-movie-rounded class="text-3xl" />
                            </div>

                            <div
                              class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
                            />
                          </div>

                          <div class="flex min-w-0 flex-col overflow-hidden p-2.5">
                            <div class="flex min-w-0 items-center justify-between gap-2">
                              <span class="text-[10px] font-black uppercase tracking-wider text-pink-300">Resume</span>
                              <span class="shrink-0 text-[11px] font-bold text-[var(--color-text)]/50">
                                {{ formatProgressLabel(item.progress) }}
                              </span>
                            </div>

                            <NTitleTransition
                              as="h3"
                              :text="getPreferenceAnimeTitle(item)"
                              :title="getPreferenceAnimeTitle(item)"
                              :transition-key="`${selectedLanguage}-${item.id}-${getPreferenceAnimeTitle(item)}`"
                              class="mt-1 block min-w-0 truncate text-sm font-extrabold leading-[18px] text-white transition group-hover:text-pink-300"
                            />

                            <p class="mt-auto truncate pt-2 text-[11px] font-bold text-[var(--color-text)]/62">
                              {{ formatEpisodeMeta(item.episode, item.language) }}
                            </p>

                            <div class="mt-2">
                              <div class="h-1 overflow-hidden rounded-full bg-white/10">
                                <div class="h-full rounded-full bg-pink-300" :style="{ width: `${item.progress}%` }" />
                              </div>
                            </div>
                          </div>
                        </NuxtLink>
                      </NAnimeHoverCard>
                    </div>
                  </div>

                  <div
                    v-if="hasContinueWatchingNavigation"
                    class="absolute bottom-1 right-0 top-0 z-10 flex w-9 flex-col gap-3"
                  >
                    <button
                      type="button"
                      class="continue-next flex flex-1 items-center justify-center rounded-lg border-0 bg-[#45475a] text-white transition hover:bg-[#585b70] hover:text-pink-300"
                      aria-label="Next continue watching anime"
                      @click="scrollCarouselItem(continueWatchingScroller, 1)"
                    >
                      <div i-ci-caret-right-sm class="text-3xl" />
                    </button>
                    <button
                      type="button"
                      class="continue-prev flex flex-1 items-center justify-center rounded-lg border-0 bg-[#45475a] text-white transition hover:bg-[#585b70] hover:text-pink-300"
                      aria-label="Previous continue watching anime"
                      @click="scrollCarouselItem(continueWatchingScroller, -1)"
                    >
                      <div i-ci-caret-left-sm class="text-3xl" />
                    </button>
                  </div>
                </div>
              </div>

              <aside v-if="upNextItems.length" class="min-w-0">
                <div class="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 class="text-xl font-extrabold tracking-wide text-pink-300 sm:text-2xl">Up Next</h2>
                    <p class="mt-1 hidden text-sm font-medium text-[var(--color-text)]/55 sm:block">
                      Picks from your watchlist and activity.
                    </p>
                  </div>

                  <NuxtLink
                    v-if="watchlist.length"
                    to="/watchlist"
                    class="flex shrink-0 items-center gap-1 text-xs font-black text-[var(--color-text)]/70 no-underline transition hover:text-pink-300"
                  >
                    <span>Watchlist</span>
                    <div i-ci-caret-right-sm class="text-lg" />
                  </NuxtLink>
                </div>

                <div class="relative pr-0" :class="hasUpNextNavigation ? 'pr-12' : ''">
                  <div
                    ref="upNextScroller"
                    class="up-next-grid flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 sm:overflow-hidden"
                    :style="{
                      '--up-next-card-width': upNextDesktopCardWidth,
                    }"
                  >
                    <div
                      v-for="item in upNextItems"
                      :key="item.key"
                      class="shrink-0 snap-start min-[520px]:w-[410px] md:w-auto"
                      :class="hasUpNextNavigation ? 'w-[calc(100vw-5rem)]' : 'w-[calc(100vw-2rem)]'"
                    >
                      <NAnimeHoverCard :anime-id="item.id">
                        <NuxtLink
                          :to="item.to"
                          class="group grid h-[118px] w-full grid-cols-[78px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/70 text-[var(--color-text)] no-underline transition hover:-translate-y-0.5 hover:border-pink-300/40 hover:bg-[var(--color-background-mute)]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                          @focus="prefetchAnimePage(item.id, item.image)"
                          @pointerenter="prefetchAnimePage(item.id, item.image)"
                        >
                          <div class="relative h-[118px] overflow-hidden bg-[var(--color-background-mute)]">
                            <NRemoteImage
                              v-if="item.image"
                              :src="item.image"
                              :alt="item.title"
                              :placeholder-color="item.color"
                              class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div v-else class="grid h-full w-full place-items-center text-pink-300">
                              <div i-material-symbols-movie-rounded class="text-3xl" />
                            </div>
                            <div
                              class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
                            />
                          </div>

                          <div class="flex min-w-0 flex-col overflow-hidden p-2.5">
                            <div class="flex min-w-0 items-center justify-between gap-2">
                              <div
                                class="flex min-w-0 items-center gap-1 text-[10px] font-black uppercase text-pink-300"
                              >
                                <div
                                  v-if="item.kind === 'new-episode'"
                                  i-material-symbols-notifications-active-rounded
                                  class="shrink-0 text-sm"
                                />
                                <div
                                  v-else-if="item.kind === 'plan'"
                                  i-material-symbols-bookmark-rounded
                                  class="shrink-0 text-sm"
                                />
                                <div v-else i-material-symbols-auto-awesome-rounded class="shrink-0 text-sm" />
                                <span class="truncate">{{ item.badge }}</span>
                              </div>
                            </div>

                            <NTitleTransition
                              as="h3"
                              :text="item.title"
                              :title="item.title"
                              :transition-key="`${selectedLanguage}-${item.key}-${item.title}`"
                              class="mt-1 block min-w-0 truncate text-sm font-extrabold leading-[18px] text-white transition group-hover:text-pink-300"
                            />

                            <div class="mt-auto flex min-w-0 items-center justify-between gap-2 pt-2 text-[11px]">
                              <span class="min-w-0 truncate font-bold text-[var(--color-text)]/58">{{
                                item.meta
                              }}</span>
                              <span class="shrink-0 font-black text-pink-300">{{ item.actionLabel }}</span>
                            </div>

                            <div
                              v-if="item.progress !== undefined"
                              class="mt-2 h-1 overflow-hidden rounded-full bg-white/10"
                            >
                              <div class="h-full rounded-full bg-pink-300" :style="{ width: `${item.progress}%` }" />
                            </div>
                          </div>
                        </NuxtLink>
                      </NAnimeHoverCard>
                    </div>
                  </div>

                  <div v-if="hasUpNextNavigation" class="absolute bottom-1 right-0 top-0 z-10 flex w-9 flex-col gap-3">
                    <button
                      type="button"
                      class="up-next-next flex flex-1 items-center justify-center rounded-lg border-0 bg-[#45475a] text-white transition hover:bg-[#585b70] hover:text-pink-300"
                      aria-label="Next up next anime"
                      @click="scrollCarouselItem(upNextScroller, 1)"
                    >
                      <div i-ci-caret-right-sm class="text-3xl" />
                    </button>
                    <button
                      type="button"
                      class="up-next-prev flex flex-1 items-center justify-center rounded-lg border-0 bg-[#45475a] text-white transition hover:bg-[#585b70] hover:text-pink-300"
                      aria-label="Previous up next anime"
                      @click="scrollCarouselItem(upNextScroller, -1)"
                    >
                      <div i-ci-caret-left-sm class="text-3xl" />
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section
        v-if="homeListSections.some((section) => section.items.length)"
        class="grid gap-7 border-t border-[var(--color-border)] px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8 2xl:grid-cols-4"
      >
        <div v-for="section in homeListSections" :key="section.title" class="min-w-0">
          <div class="mb-5">
            <h2 class="text-2xl font-extrabold tracking-wide text-pink-300">
              {{ section.title }}
            </h2>
          </div>

          <div>
            <NAnimeHoverCard v-for="anime in section.items" :key="anime.id" :anime-id="anime.id">
              <NuxtLink
                :to="`/anime/${anime.id}`"
                class="group flex min-h-[108px] gap-4 border-b border-[#343347] py-4 text-[var(--color-text)] no-underline transition hover:text-pink-300"
                @focus="prefetchAnimePage(anime.id, anime.image)"
                @pointerenter="prefetchAnimePage(anime.id, anime.image)"
              >
                <NRemoteImage
                  :src="anime.image"
                  :alt="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                  :placeholder-color="anime.color"
                  class="h-[76px] w-[60px] shrink-0 object-cover"
                  loading="lazy"
                />

                <div class="min-w-0 flex-1 pt-1">
                  <NTitleTransition
                    as="h3"
                    :text="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                    :title="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                    :transition-key="`${selectedLanguage}-${anime.id}`"
                    class="block truncate text-sm font-medium leading-5 text-white transition group-hover:text-pink-300"
                  />

                  <div class="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--color-text)]/70">
                    <span class="inline-flex shrink-0 overflow-hidden rounded-sm font-bold text-[#1e1e2e]">
                      <span
                        v-if="anime.sub"
                        class="inline-flex items-center gap-1 bg-[#a6e3a1] px-1.5 py-0.5"
                        :title="`${anime.sub} subbed episodes`"
                      >
                        <span i-material-symbols-closed-caption-rounded class="text-[13px]" />
                        {{ anime.sub }}
                      </span>
                      <span
                        v-if="anime.dub"
                        class="inline-flex items-center gap-1 bg-[#b9ddf2] px-1.5 py-0.5"
                        :title="`${anime.dub} dubbed episodes`"
                      >
                        <span i-material-symbols-mic-rounded class="text-[13px]" />
                        {{ anime.dub }}
                      </span>
                      <span
                        class="bg-[#525164] px-1.5 py-0.5 text-white"
                        :title="anime.episodes ? `${anime.episodes} total episodes` : 'Total episodes unknown'"
                      >
                        {{ anime.episodes || '?' }}
                      </span>
                    </span>
                    <span class="shrink-0 text-[var(--color-text)]/35">•</span>
                    <span class="min-w-0 truncate">{{ anime.type }}</span>
                  </div>
                </div>
              </NuxtLink>
            </NAnimeHoverCard>
          </div>

          <NuxtLink
            :to="section.viewMoreTo"
            class="inline-flex min-h-14 items-center gap-2 text-base font-normal text-[var(--color-text)] no-underline transition hover:text-pink-300"
          >
            <span>View more</span>
            <div i-ci-caret-right-sm class="text-xl" />
          </NuxtLink>
        </div>
      </section>

      <section
        v-if="youMayAlsoWatchAnimes.length || visibleGenres.length"
        class="grid gap-8 border-t border-[var(--color-border)] px-4 py-8 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_412px]"
      >
        <div v-if="youMayAlsoWatchAnimes.length" class="min-w-0">
          <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 class="text-2xl font-extrabold tracking-wide text-pink-300">You may also watch</h2>

            <NuxtLink
              :to="categoryTo('you-may-also-watch')"
              class="hidden items-center gap-1 text-sm font-semibold text-[var(--color-text)]/80 no-underline transition hover:text-pink-300 sm:flex"
            >
              <span>View more</span>
              <div i-ci-caret-right-sm class="text-xl" />
            </NuxtLink>
          </div>

          <div class="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 2xl:grid-cols-6">
            <NAnimeHoverCard v-for="anime in youMayAlsoWatchAnimes" :key="anime.id" :anime-id="anime.id">
              <NuxtLink
                :to="`/anime/${anime.id}`"
                class="group block min-w-0 text-[var(--color-text)] no-underline"
                @focus="prefetchAnimePage(anime.id, anime.image)"
                @pointerenter="prefetchAnimePage(anime.id, anime.image)"
              >
                <div class="relative aspect-[3/4] overflow-hidden bg-[var(--color-background-soft)]">
                  <NRemoteImage
                    :src="anime.image"
                    :alt="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                    :placeholder-color="anime.color"
                    class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  <div
                    class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-2"
                  >
                    <span class="rounded bg-green-200 px-1.5 py-0.5 text-[10px] font-bold text-black">CC</span>
                    <span
                      v-if="anime.episodes"
                      class="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white"
                    >
                      {{ anime.episodes }} EPS
                    </span>
                  </div>
                </div>

                <NTitleTransition
                  as="h3"
                  :text="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                  :transition-key="`${selectedLanguage}-${anime.id}`"
                  class="mt-3 line-clamp-1 text-sm font-bold text-white transition group-hover:text-pink-300"
                />

                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text)]/70">
                  <span>{{ anime.type }}</span>
                  <span class="text-[var(--color-text)]/40">•</span>
                  <span>{{ anime.date || 'TBA' }}</span>
                </div>
              </NuxtLink>
            </NAnimeHoverCard>
          </div>
        </div>

        <aside v-if="visibleGenres.length" class="min-w-0">
          <h2 class="mb-6 text-2xl font-extrabold tracking-wide text-[#f5b5dc]">Genres</h2>

          <div class="bg-[#383747] p-6">
            <div class="grid grid-cols-3 gap-x-5 gap-y-5">
              <NuxtLink
                v-for="(genre, index) in visibleGenres"
                :key="genre"
                :to="`/genre/${encodeURIComponent(genre)}`"
                class="truncate text-sm font-semibold no-underline transition hover:opacity-85"
                :style="getGenreTextStyle(index)"
              >
                {{ genre }}
              </NuxtLink>
            </div>

            <button
              v-if="(homeDiscoverData?.genres?.length || 0) > 30"
              type="button"
              class="mt-7 w-full rounded-md border-0 bg-[#504f61] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5a596d] hover:text-pink-200"
              @click="areAllGenresShown = !areAllGenresShown"
            >
              {{ areAllGenresShown ? 'Show less' : 'Show more' }}
            </button>
          </div>
        </aside>
      </section>

      <section
        v-if="isScheduleReady && scheduleData?.length"
        id="schedule"
        class="border-t border-[var(--color-border)] px-4 py-8 sm:px-6 lg:px-8"
      >
        <div class="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div class="min-w-0">
            <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 class="text-2xl font-extrabold tracking-wide text-pink-300">Estimated Schedule</h2>

              <div
                class="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-black sm:text-sm"
              >
                <span>{{ timezoneLabel }}</span>
                <time :datetime="currentTime.toISOString()">{{ formattedCurrentTime }}</time>
              </div>
            </div>

            <div class="mb-8 flex items-center gap-3">
              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white text-black transition hover:bg-pink-300"
                aria-label="Previous schedule day"
                @click="selectAdjacentScheduleDay(-1)"
              >
                <div i-ci-caret-left-sm class="text-2xl" />
              </button>

              <div ref="scheduleDaysScroller" class="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-1">
                <button
                  v-for="day in scheduleDays"
                  :key="day.key"
                  type="button"
                  :data-schedule-day="day.key"
                  class="w-[9.5rem] shrink-0 rounded-lg border-0 px-4 py-4 text-center transition sm:w-[11rem] lg:flex-1"
                  :class="
                    selectedScheduleDate === day.key
                      ? 'bg-pink-300 text-black'
                      : 'bg-[var(--color-background-soft)] text-[var(--color-heading)] hover:text-pink-300'
                  "
                  @click="setSelectedScheduleDay(day.key)"
                >
                  <span class="block text-xl font-extrabold">
                    <NuxtTime :datetime="day.date" weekday="short" />
                  </span>
                  <span class="mt-1 block text-sm font-semibold opacity-80">
                    <NuxtTime :datetime="day.date" month="short" day="numeric" />
                  </span>
                </button>
              </div>

              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-white text-black transition hover:bg-pink-300"
                aria-label="Next schedule day"
                @click="selectAdjacentScheduleDay(1)"
              >
                <div i-ci-caret-right-sm class="text-2xl" />
              </button>
            </div>

            <div class="overflow-hidden rounded-lg bg-[var(--color-background-soft)]">
              <template v-if="scheduleForSelectedDay.length">
                <NuxtLink
                  v-for="anime in scheduleForSelectedDay"
                  :key="anime.id"
                  :to="`/anime/${anime.animeId}`"
                  class="group grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4 border-b border-dark-300 px-4 py-5 text-[var(--color-text)] no-underline transition last:border-b-0 hover:bg-[var(--vt-c-black-mute)]/35 hover:text-pink-300 sm:grid-cols-[90px_minmax(0,1fr)]"
                  @focus="prefetchAnimePage(anime.animeId)"
                  @pointerenter="prefetchAnimePage(anime.animeId)"
                >
                  <span class="text-lg font-extrabold text-[var(--color-text)]/65">
                    <NuxtTime
                      :datetime="new Date(anime.airingAt * 1000)"
                      hour="2-digit"
                      minute="2-digit"
                      :hour12="false"
                    />
                  </span>

                  <NTitleTransition
                    :text="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                    :transition-key="`${selectedLanguage}-${anime.id}`"
                    class="min-w-0 truncate text-base text-white transition group-hover:text-pink-300 sm:text-lg"
                  />
                </NuxtLink>
              </template>

              <div v-else class="px-4 py-8 text-sm font-semibold text-[var(--color-text)]/70">
                No upcoming episodes listed for this day yet.
              </div>
            </div>
          </div>

          <aside v-if="mostViewedAnimes.length" class="min-w-0">
            <div class="mb-5 flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap">
              <h2 class="shrink-0 whitespace-nowrap text-2xl font-extrabold tracking-wide text-pink-300">
                Most Viewed
              </h2>

              <div class="grid min-w-0 grid-cols-3 gap-2">
                <button
                  v-for="range in mostViewedRanges"
                  :key="range"
                  type="button"
                  class="rounded border-0 px-4 py-3 text-xs font-bold transition"
                  :class="
                    activeMostViewedRange === range
                      ? 'bg-pink-300 text-black'
                      : 'bg-[var(--color-background-mute)] text-white hover:text-pink-300'
                  "
                  @click="activeMostViewedRange = range"
                >
                  {{ range }}
                </button>
              </div>
            </div>

            <div class="bg-[var(--color-background-soft)] px-4">
              <NAnimeHoverCard v-for="(anime, index) in mostViewedAnimes" :key="anime.id" :anime-id="anime.id">
                <NuxtLink
                  :to="`/anime/${anime.id}`"
                  class="group grid grid-cols-[36px_54px_minmax(0,1fr)] items-center gap-4 border-b border-dark-300 py-4 text-[var(--color-text)] no-underline transition last:border-b-0 hover:text-pink-300"
                  @focus="prefetchAnimePage(anime.id, anime.image)"
                  @pointerenter="prefetchAnimePage(anime.id, anime.image)"
                >
                  <div class="flex flex-col items-center gap-2">
                    <span class="text-lg font-extrabold text-white">{{ String(index + 1).padStart(2, '0') }}</span>
                    <span class="h-0.5 w-6 bg-pink-300" />
                  </div>

                  <NRemoteImage
                    :src="anime.image"
                    :alt="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                    :placeholder-color="anime.color"
                    class="aspect-[2/3] w-14 object-cover"
                    loading="lazy"
                  />

                  <div class="min-w-0">
                    <NTitleTransition
                      as="h3"
                      :text="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                      :title="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                      :transition-key="`${selectedLanguage}-${anime.id}`"
                      class="truncate text-sm font-extrabold leading-snug text-white transition group-hover:text-pink-300"
                    />

                    <div class="mt-2 flex items-center gap-4 text-xs font-semibold text-[var(--color-text)]/65">
                      <span class="inline-flex items-center gap-1.5">
                        <div i-material-symbols-visibility-rounded class="text-base" />
                        {{ formatCompactStat(anime.views) }}
                      </span>
                      <span class="inline-flex items-center gap-1.5">
                        <div i-material-symbols-favorite-rounded class="text-base" />
                        {{ formatCompactStat(anime.favorites) }}
                      </span>
                    </div>
                  </div>
                </NuxtLink>
              </NAnimeHoverCard>
            </div>
          </aside>
        </div>
      </section>

      <section v-if="upcomingAnimes.length" class="border-t border-[var(--color-border)] px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 class="text-2xl font-extrabold tracking-wide text-pink-300">Upcoming Animes</h2>

          <NuxtLink
            :to="categoryTo('top-upcoming')"
            class="hidden items-center gap-1 text-sm font-semibold text-[var(--color-text)]/80 no-underline transition hover:text-pink-300 sm:flex"
          >
            <span>View more</span>
            <div i-ci-caret-right-sm class="text-xl" />
          </NuxtLink>
        </div>

        <div class="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8">
          <NAnimeHoverCard v-for="anime in upcomingAnimes" :key="anime.id" :anime-id="anime.id">
            <NuxtLink
              :to="`/anime/${anime.id}`"
              class="group block min-w-0 text-[var(--color-text)] no-underline"
              @focus="prefetchAnimePage(anime.id, anime.image)"
              @pointerenter="prefetchAnimePage(anime.id, anime.image)"
            >
              <div class="relative aspect-[3/4] overflow-hidden bg-[var(--color-background-soft)]">
                <NRemoteImage
                  :src="anime.image"
                  :alt="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                  :placeholder-color="anime.color"
                  class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                <div
                  class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-2"
                >
                  <span class="rounded bg-green-200 px-1.5 py-0.5 text-[10px] font-bold text-black">CC</span>
                  <span class="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {{ anime.date || 'TBA' }}
                  </span>
                </div>
              </div>

              <NTitleTransition
                as="h3"
                :text="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                :transition-key="`${selectedLanguage}-${anime.id}`"
                class="mt-3 line-clamp-1 text-sm font-bold text-white transition group-hover:text-pink-300"
              />

              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text)]/70">
                <span>{{ anime.type }}</span>
                <span class="text-[var(--color-text)]/40">•</span>
                <span>{{ anime.date || 'TBA' }}</span>
              </div>
            </NuxtLink>
          </NAnimeHoverCard>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.spotlight-copy-panel {
  isolation: isolate;
}

.personal-feed-section::before,
.personal-feed-section::after {
  content: '';
  pointer-events: none;
  position: absolute;
  right: 0;
  left: 0;
  z-index: 0;
  height: 5rem;
}

.personal-feed-section::before {
  top: 0;
  background: linear-gradient(180deg, var(--color-background) 0%, transparent 100%);
}

.personal-feed-section::after {
  bottom: 0;
  background: linear-gradient(0deg, var(--color-background) 0%, transparent 100%);
}

.sagiri-artwork {
  mask-image: linear-gradient(180deg, #000 0%, #000 74%, rgb(0 0 0 / 88%) 82%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 74%, rgb(0 0 0 / 88%) 82%, transparent 100%);
}

@media (min-width: 1280px) {
  .continue-watching-grid {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: var(--continue-watching-card-width);
    grid-template-rows: minmax(0, 1fr);
  }
}

@media (min-width: 768px) {
  .up-next-grid {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 390px;
    grid-template-rows: minmax(0, 1fr);
  }

  .spotlight-copy-panel::after {
    --spotlight-fade-width: clamp(18rem, 34vw, 46rem);

    content: '';
    pointer-events: none;
    position: absolute;
    inset-block: 0;
    right: calc(var(--spotlight-fade-width) * -1);
    z-index: 0;
    width: var(--spotlight-fade-width);
    background: linear-gradient(90deg, var(--color-background) 0%, transparent 100%);
    background: linear-gradient(
      90deg,
      var(--color-background) 0%,
      color-mix(in srgb, var(--color-background) 96%, transparent) 16%,
      color-mix(in srgb, var(--color-background) 82%, transparent) 34%,
      color-mix(in srgb, var(--color-background) 58%, transparent) 56%,
      color-mix(in srgb, var(--color-background) 30%, transparent) 78%,
      transparent 100%
    );
  }
}

@media (min-width: 1536px) {
  .up-next-grid {
    grid-auto-columns: var(--up-next-card-width);
  }
}
</style>
