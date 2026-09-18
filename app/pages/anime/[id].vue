<script setup lang="ts">
import { isSupportedAnimeGenre } from '#shared/animeGenres'

type AnimeTitle = {
  romaji?: string
  english?: string
  native?: string
  userPreferred?: string
}

type FuzzyDate = {
  year?: number
  month?: number
  day?: number
}

type AnimeTrailer = {
  id?: string
  site?: string
  thumbnail?: string
}

type AnimeRanking = {
  id: number
  rank: number
  type?: string
  format?: string
  year?: number
  season?: string
  allTime?: boolean
  context?: string
}

type AnimeExternalLink = {
  id: number
  url?: string
  site: string
  type?: string
  language?: string
}

type AnimeStreamingEpisode = {
  title?: string
  url?: string
  site?: string
  thumbnail?: string
}

type AnimePerson = {
  id: number
  name?: {
    full?: string
    native?: string
    userPreferred?: string
  }
  image?: {
    large?: string
    medium?: string
  }
  language?: string
  primaryOccupations?: string[]
}

type AnimeCharacter = AnimePerson & {
  role?: string
  voiceActor?: AnimePerson
}

type AnimeStaff = AnimePerson & {
  role?: string
}

type NextAiringEpisode = {
  airingAt: number
  episode: number
  timeUntilAiring: number
}

type AnimeDetails = {
  id: number
  idMal?: number
  title?: AnimeTitle
  description?: string
  startDate?: FuzzyDate
  endDate?: FuzzyDate
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
  trending?: number
  genres?: string[]
  synonyms?: string[]
  bannerImage?: string
  coverImage?: {
    extraLarge?: string
    large?: string
    color?: string
  }
  trailer?: AnimeTrailer
  characters?: {
    nodes?: AnimeCharacter[]
  }
  staff?: {
    nodes?: AnimeStaff[]
  }
  nextAiringEpisode?: NextAiringEpisode
  rankings?: AnimeRanking[]
  externalLinks?: AnimeExternalLink[]
  streamingEpisodes?: AnimeStreamingEpisode[]
  studios?: {
    nodes?: Array<{ id: number; name: string }>
  }
}

type ProgressConfirmationAction = 'complete' | 'clear'

const route = useRoute()
const id = computed(() => String(route.params.id))
const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))
const userPreferences = useUserPreferencesStore()
const { defaultWatchLanguage, watchedEpisodes } = storeToRefs(userPreferences)
const { getAlternateAnimeTitle, getAnimeTitle } = useAnimeTitle(selectedLanguage)
const { cleanAnimeDescription, formatAnimeDate, formatAnimeNumber, formatAnimeText } = useAnimeFormatters()
const { isAnimeSaved, toggleAnimeSaved } = useAnimeWatchlist()
const animeDetailsRefreshIntervalMs = 60 * 1000

const {
  data: anime,
  pending,
  error,
  refresh: refreshAnimeDetails,
} = await useFetch<AnimeDetails>(() => `/api/myanimelist/${id.value}`, {
  key: () => `mal-anime-${id.value}-details-v5`,
  getCachedData: (key, nuxtApp) => (nuxtApp.isHydrating ? nuxtApp.payload.data[key] : undefined),
  watch: [id],
})

const toAnimeNotFoundError = () =>
  createError({
    statusCode: error.value?.statusCode || 404,
    statusMessage: error.value?.statusMessage || 'Anime not found.',
    fatal: true,
  })

if (error.value) {
  setResponseStatus(error.value.statusCode || 404, error.value.statusMessage || 'Anime not found.')
}

watch(error, (fetchError) => {
  if (!fetchError) return
  if (!import.meta.client) return

  showError(toAnimeNotFoundError())
})

const episodeRangeSize = 100
const selectedEpisodeRangeIndex = ref(0)
const isEpisodeRangeOpen = ref(false)
const isProgressModalOpen = ref(false)
const progressEpisodeInput = ref(1)
const progressConfirmationAction = ref<ProgressConfirmationAction | null>(null)
const isTrailerModalOpen = ref(false)
const isBodyScrollLocked = useScrollLock(import.meta.client ? document.body : null)
let animeDetailsRefreshTimer: ReturnType<typeof setInterval> | undefined

const shouldRefreshCurrentEpisodes = () => {
  return anime.value?.status === 'RELEASING' || Boolean(anime.value?.nextAiringEpisode)
}

const refreshCurrentEpisodes = () => {
  if (!shouldRefreshCurrentEpisodes()) return

  void refreshAnimeDetails({ dedupe: 'cancel' })
}

onMounted(() => {
  refreshCurrentEpisodes()
  animeDetailsRefreshTimer = setInterval(refreshCurrentEpisodes, animeDetailsRefreshIntervalMs)
})

onUnmounted(() => {
  if (animeDetailsRefreshTimer) {
    clearInterval(animeDetailsRefreshTimer)
  }

  isBodyScrollLocked.value = false
})

const getTitle = (mediaTitle?: AnimeTitle) => getAnimeTitle(mediaTitle)
const getAlternateTitle = (mediaTitle?: AnimeTitle) => getAlternateAnimeTitle(mediaTitle)
const formatText = (value?: string) => formatAnimeText(value)
const formatDate = (date?: FuzzyDate) => formatAnimeDate(date)
const formatNumber = (value?: number) => formatAnimeNumber(value)
const isVisibleAnimeGenre = (genre?: string) => {
  return isSupportedAnimeGenre(genre)
}

const formatAiringDate = (timestamp?: number) => {
  if (!timestamp) return ''

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp * 1000)
}

const cleanDescription = computed(() => {
  return cleanAnimeDescription(anime.value?.description, 'No description is available yet.')
})

const title = computed(() => {
  return getTitle(anime.value?.title)
})

const alternateTitle = computed(() => {
  const alternate = getAlternateTitle(anime.value?.title)

  return alternate && alternate !== title.value ? alternate : ''
})

const heroFallbackImage = computed(() => {
  return anime.value?.coverImage?.extraLarge || anime.value?.coverImage?.large || ''
})

const heroImage = computed(() => {
  return anime.value?.bannerImage || heroFallbackImage.value
})

const watchlistImage = computed(() => {
  return anime.value?.coverImage?.large || anime.value?.coverImage?.extraLarge || ''
})

const isSaved = computed(() => {
  return isAnimeSaved(anime.value?.id)
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

const visibleAnimeGenres = computed(() => {
  return anime.value?.genres?.filter(isVisibleAnimeGenre) || []
})

const availableEpisodeNumbers = computed(() => {
  return getAvailableEpisodeNumbers(anime.value)
})

const currentEpisodeCount = computed(() => {
  return availableEpisodeNumbers.value.length
})

const plannedEpisodeCount = computed(() => {
  return anime.value?.episodes || 0
})

const currentEpisodeLabel = computed(() => {
  const count = currentEpisodeCount.value

  if (!count) return ''

  return `${count} ${count === 1 ? 'Episode' : 'Episodes'}`
})

const episodeAvailabilitySummary = computed(() => {
  const current = currentEpisodeCount.value
  const planned = plannedEpisodeCount.value

  if (!current) {
    return anime.value?.status === 'NOT_YET_RELEASED' ? 'Episodes have not started airing yet' : 'No episodes available'
  }

  if (anime.value?.status === 'RELEASING' && planned > current) {
    return `${current} of ${planned} episodes available`
  }

  return `${current} ${current === 1 ? 'episode' : 'episodes'} available`
})

const releaseProgressPercent = computed(() => {
  if (!currentEpisodeCount.value || !plannedEpisodeCount.value) return 0

  return Math.min(Math.round((currentEpisodeCount.value / plannedEpisodeCount.value) * 100), 100)
})

const nextAiringLabel = computed(() => {
  const nextEpisode = anime.value?.nextAiringEpisode

  if (!nextEpisode?.episode) return ''

  const airingDate = formatAiringDate(nextEpisode.airingAt)

  return airingDate ? `Episode ${nextEpisode.episode} airs ${airingDate}` : `Episode ${nextEpisode.episode} is next`
})

const metaItems = computed(() => {
  const media = anime.value

  return [
    media?.format ? formatText(media.format) : undefined,
    media?.status ? formatText(media.status) : undefined,
    media?.season && media.seasonYear ? `${formatText(media.season)} ${media.seasonYear}` : undefined,
    currentEpisodeLabel.value || undefined,
    media?.duration ? `${media.duration}m` : undefined,
  ].filter((item): item is string => Boolean(item))
})

const episodeRangeOptions = computed(() => {
  const ranges: Array<{ index: number; label: string; episodes: number[] }> = []

  for (let index = 0; index < availableEpisodeNumbers.value.length; index += episodeRangeSize) {
    const episodes = availableEpisodeNumbers.value.slice(index, index + episodeRangeSize)
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

const displayedEpisodeNumbers = computed(() => {
  return selectedEpisodeRange.value?.episodes || availableEpisodeNumbers.value
})

const firstAvailableEpisode = computed(() => {
  return availableEpisodeNumbers.value[0] || 0
})

const watchedEpisodeNumbers = computed(() => {
  return new Set(
    watchedEpisodes.value
      .filter((entry) => entry.id === anime.value?.id && entry.language === defaultWatchLanguage.value)
      .map((entry) => entry.episode),
  )
})

const currentLanguageProgressPercent = computed(() => {
  return availableEpisodeNumbers.value.length
    ? Math.min(Math.round((watchedEpisodeNumbers.value.size / availableEpisodeNumbers.value.length) * 100), 100)
    : 0
})

const isEpisodeWatched = (episode: number) => {
  return watchedEpisodeNumbers.value.has(episode)
}

const getEpisodeRangeWatchedCount = (episodes: number[]) => {
  return episodes.filter(isEpisodeWatched).length
}

const highestConsecutiveWatchedEpisode = computed(() => {
  let highestEpisode = 0

  for (const episode of availableEpisodeNumbers.value) {
    if (!isEpisodeWatched(episode)) break

    highestEpisode = episode
  }

  return highestEpisode
})

const lastAvailableEpisode = computed(() => {
  return availableEpisodeNumbers.value.at(-1) || firstAvailableEpisode.value
})

const nextUnwatchedEpisode = computed(() => {
  return availableEpisodeNumbers.value.find((episode) => !isEpisodeWatched(episode)) || 0
})

const animeProgress = computed(() => {
  return userPreferences.getWatchlistProgress(
    anime.value?.id || 0,
    availableEpisodeNumbers.value.length || anime.value?.episodes || 0,
  )
})

const continueWatchingEntry = computed(() => {
  if (!anime.value) return undefined

  const entry = userPreferences.getContinueWatching(anime.value.id)

  if (!entry || !availableEpisodeNumbers.value.includes(entry.episode)) {
    return undefined
  }

  return entry
})

const watchButtonEpisode = computed(() => {
  return continueWatchingEntry.value?.episode || firstAvailableEpisode.value
})

const watchButtonLanguage = computed(() => {
  return continueWatchingEntry.value?.language || defaultWatchLanguage.value
})

const watchButtonTo = computed(() => {
  if (!anime.value || !watchButtonEpisode.value) return ''

  return `/watch/${anime.value.id}?episode=${watchButtonEpisode.value}&language=${watchButtonLanguage.value}`
})

const nextUnwatchedTo = computed(() => {
  if (!anime.value || !nextUnwatchedEpisode.value) return ''

  return `/watch/${anime.value.id}?episode=${nextUnwatchedEpisode.value}&language=${defaultWatchLanguage.value}`
})

const watchedActionPayload = computed(() => {
  return {
    id: anime.value?.id || 0,
    title: title.value,
    image: watchlistImage.value,
    language: defaultWatchLanguage.value,
  }
})

const closeProgressModal = () => {
  isProgressModalOpen.value = false
  progressConfirmationAction.value = null
}

const openProgressModal = () => {
  if (!availableEpisodeNumbers.value.length) return

  progressEpisodeInput.value =
    highestConsecutiveWatchedEpisode.value || nextUnwatchedEpisode.value || firstAvailableEpisode.value
  progressConfirmationAction.value = null
  isEpisodeRangeOpen.value = false
  isTrailerModalOpen.value = false
  isProgressModalOpen.value = true
}

const setWatchedThroughEpisode = () => {
  if (!anime.value) return

  const requestedEpisode = Math.trunc(Number(progressEpisodeInput.value))
  const episode = Math.min(Math.max(requestedEpisode, firstAvailableEpisode.value), lastAvailableEpisode.value)
  const episodes = availableEpisodeNumbers.value.filter((episodeNumber) => episodeNumber <= episode)
  const lastMarkedEpisode = episodes.at(-1)

  if (!Number.isFinite(requestedEpisode) || !lastMarkedEpisode) {
    userPreferences.pushToast('Enter a valid episode number', 'error')
    return
  }

  userPreferences.setEpisodesWatched(watchedActionPayload.value, episodes)
  userPreferences.pushToast(`Progress updated through episode ${lastMarkedEpisode}`, 'success')
  closeProgressModal()
}

const markSelectedRangeWatched = () => {
  if (!anime.value || !selectedEpisodeRange.value) return

  userPreferences.markEpisodesWatched(watchedActionPayload.value, selectedEpisodeRange.value.episodes)
  userPreferences.pushToast(`Episodes ${selectedEpisodeRange.value.label} marked watched`, 'success')
  closeProgressModal()
}

const confirmProgressAction = () => {
  if (!anime.value || !progressConfirmationAction.value) return

  if (progressConfirmationAction.value === 'complete') {
    userPreferences.setEpisodesWatched(watchedActionPayload.value, availableEpisodeNumbers.value)
    userPreferences.pushToast('All episodes marked watched', 'success')
  } else {
    userPreferences.clearWatchedEpisodes(anime.value.id, defaultWatchLanguage.value)
    userPreferences.pushToast(`${defaultWatchLanguage.value.toUpperCase()} watched progress cleared`, 'info')
  }

  closeProgressModal()
}

watch(id, () => {
  selectedEpisodeRangeIndex.value = 0
  isEpisodeRangeOpen.value = false
  closeProgressModal()
  isTrailerModalOpen.value = false
})

watch(
  [isProgressModalOpen, isTrailerModalOpen],
  ([isProgressOpen, isTrailerOpen]) => {
    isBodyScrollLocked.value = isProgressOpen || isTrailerOpen
  },
  { immediate: true },
)

const selectEpisodeRange = (rangeIndex: number) => {
  selectedEpisodeRangeIndex.value = rangeIndex
  isEpisodeRangeOpen.value = false
}

const trailerEmbedUrl = computed(() => {
  const trailer = anime.value?.trailer

  if (!trailer?.id || trailer.site !== 'youtube') {
    return ''
  }

  return `https://www.youtube.com/embed/${trailer.id}?autoplay=1&rel=0`
})

const openTrailerModal = () => {
  if (!trailerEmbedUrl.value) return

  closeProgressModal()
  isTrailerModalOpen.value = true
}

const closeTrailerModal = () => {
  isTrailerModalOpen.value = false
}

const handleModalKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return

  if (isProgressModalOpen.value) {
    closeProgressModal()
    return
  }

  if (isTrailerModalOpen.value) {
    closeTrailerModal()
  }
}

useEventListener(import.meta.client ? document : null, 'keydown', handleModalKeydown)

const detailRows = computed(() => {
  const media = anime.value
  const episodeRows =
    media?.status === 'RELEASING'
      ? [
          ['Episodes available', currentEpisodeCount.value || undefined],
          [
            'Planned episodes',
            plannedEpisodeCount.value && plannedEpisodeCount.value !== currentEpisodeCount.value
              ? plannedEpisodeCount.value
              : undefined,
          ],
        ]
      : [['Episodes', currentEpisodeCount.value || plannedEpisodeCount.value || undefined]]

  return [
    ['MAL ID', media?.idMal],
    ['Score', media?.averageScore ? `${media.averageScore}%` : undefined],
    ['Mean Score', media?.meanScore ? `${media.meanScore}%` : undefined],
    ['Members', formatNumber(media?.popularity)],
    ['Favorites', formatNumber(media?.favourites)],
    ['MAL Rank', media?.trending ? `#${formatNumber(media.trending)}` : undefined],
    ['Format', formatText(media?.format)],
    ['Status', formatText(media?.status)],
    ['Source', formatText(media?.source)],
    ...episodeRows,
    ['Duration', media?.duration ? `${media.duration} min` : undefined],
    ['Season', media?.season && media.seasonYear ? `${formatText(media.season)} ${media.seasonYear}` : undefined],
    ['Start Date', formatDate(media?.startDate)],
    ['End Date', formatDate(media?.endDate)],
    ['Country', media?.countryOfOrigin],
    ['Studio', studioNames.value],
  ].filter(([, value]) => value !== undefined && value !== '' && value !== 'N/A')
})

const studioNames = computed(() => {
  return (
    anime.value?.studios?.nodes
      ?.map((studio) => studio.name)
      .filter(Boolean)
      .join(', ') || ''
  )
})

const quickStats = computed(() => {
  const media = anime.value

  return [
    { label: 'Score', value: media?.averageScore ? `${media.averageScore}%` : '' },
    { label: 'Members', value: formatNumber(media?.popularity) },
    { label: 'Favorites', value: formatNumber(media?.favourites) },
    { label: 'MAL Rank', value: media?.trending ? `#${formatNumber(media.trending)}` : '' },
  ].filter((item) => item.value && item.value !== 'N/A')
})

const visibleRankings = computed(() => {
  return anime.value?.rankings?.slice(0, 6) || []
})

const visibleExternalLinks = computed(() => {
  return anime.value?.externalLinks?.filter((item) => item.url).slice(0, 8) || []
})

const visibleStreamingEpisodes = computed(() => {
  return anime.value?.streamingEpisodes?.filter((item) => item.url).slice(0, 4) || []
})

const visibleCharacters = computed(() => {
  return anime.value?.characters?.nodes?.slice(0, 12) || []
})

const visibleStaff = computed(() => {
  return anime.value?.staff?.nodes?.slice(0, 10) || []
})

const personName = (person?: AnimePerson) => {
  return person?.name?.userPreferred || person?.name?.full || person?.name?.native || 'Unknown'
}

const personImage = (person?: AnimePerson) => {
  return person?.image?.large || person?.image?.medium || ''
}

const formatRole = (role?: string) => {
  return formatText(role)
}

useSeoMeta({
  title: () => `${title.value} - Noxy`,
  description: () => anime.value?.description?.replace(/\n/g, ' ').slice(0, 155) || 'Anime details on Noxy.',
})
</script>

<template>
  <main class="min-h-screen overflow-x-hidden bg-[var(--color-background)] text-[var(--color-text)]">
    <div v-if="pending" class="animate-pulse">
      <section class="relative overflow-hidden border-b border-[var(--color-border)]">
        <div class="absolute inset-0 bg-[var(--color-background-soft)]" />
        <div
          class="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,24,37,.98)_0%,rgba(24,24,37,.88)_42%,rgba(24,24,37,.7)_100%)]"
        />
        <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--color-background)] to-transparent" />

        <div
          class="relative mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-24 sm:px-6 lg:grid-cols-[220px_1fr] lg:pb-16 lg:pt-32"
        >
          <div class="aspect-[2/3] w-48 rounded bg-white/10 shadow-xl lg:w-full" />

          <div class="flex flex-col justify-end">
            <div class="mb-4 flex flex-wrap gap-2">
              <div v-for="item in 5" :key="item" class="h-6 w-20 rounded bg-white/10" />
            </div>

            <div class="h-12 w-full max-w-3xl rounded bg-white/10 md:h-14" />
            <div class="mt-3 h-6 w-64 max-w-full rounded bg-pink-300/20" />

            <div class="mt-6 flex flex-wrap gap-3">
              <div class="h-12 w-36 rounded bg-pink-300/35" />
              <div class="h-12 w-32 rounded bg-white/10" />
              <div class="h-12 w-28 rounded bg-white/10" />
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="min-w-0">
          <div class="space-y-3">
            <div class="h-4 w-full rounded bg-[var(--color-background-soft)]" />
            <div class="h-4 w-11/12 rounded bg-[var(--color-background-soft)]" />
            <div class="h-4 w-10/12 rounded bg-[var(--color-background-soft)]" />
            <div class="h-4 w-2/3 rounded bg-[var(--color-background-soft)]" />
          </div>

          <div class="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
            <div v-for="item in 12" :key="item" class="h-10 rounded bg-[var(--color-background-soft)]" />
          </div>

          <NAnimeGridSkeleton :count="10" />
        </div>

        <aside class="space-y-4">
          <div v-for="item in 10" :key="item" class="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
            <div class="h-4 rounded bg-[var(--color-background-soft)]" />
            <div class="h-4 rounded bg-[var(--color-background-soft)]" />
          </div>
        </aside>
      </section>
    </div>

    <NErrorState
      v-else-if="error"
      :status-code="error.statusCode || 404"
      title="Anime not found"
      :message="
        error.statusMessage ||
        'This anime could not be loaded. The MAL id may be invalid, or the title is no longer available.'
      "
    />

    <template v-else-if="anime">
      <section class="relative isolate overflow-hidden border-b border-white/8">
        <NRemoteImage
          v-if="heroImage"
          :src="heroImage"
          :fallback-src="heroFallbackImage"
          :alt="title"
          :placeholder-color="anime.coverImage?.color"
          class="absolute inset-0 -z-30 h-full w-full scale-[1.03] object-cover object-center"
        />
        <div v-else class="absolute inset-0 -z-30 bg-[var(--color-background-soft)]" />
        <div
          class="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(19,18,31,.98)_0%,rgba(24,24,40,.92)_46%,rgba(24,24,40,.68)_100%)]"
        />
        <div
          class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_74%_14%,rgba(249,168,212,.16),transparent_30%),linear-gradient(0deg,#1e1e2e_0%,transparent_42%)]"
        />

        <div
          class="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28 lg:px-8 lg:pb-16 lg:pt-32"
        >
          <div class="grid min-w-0 gap-5 sm:gap-7 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center lg:gap-10">
            <div class="mx-auto w-full max-w-[210px] lg:-translate-y-4 lg:max-w-none">
              <div class="relative overflow-hidden border border-white/15 bg-[#181825] shadow-2xl shadow-black/45">
                <NRemoteImage
                  :src="anime.coverImage?.extraLarge || anime.coverImage?.large"
                  :alt="title"
                  :placeholder-color="anime.coverImage?.color"
                  class="aspect-[2/3] w-full object-cover"
                />
                <span
                  v-if="anime.status === 'RELEASING'"
                  class="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-pink-300 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-black shadow-lg shadow-black/25"
                >
                  <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
                  Airing
                </span>
              </div>
            </div>

            <div class="min-w-0 pb-1">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-for="item in metaItems"
                  :key="item"
                  class="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-[11px] font-bold text-white/85 backdrop-blur-md"
                >
                  {{ item }}
                </span>
              </div>

              <NTitleTransition
                as="h1"
                :text="title"
                :transition-key="selectedLanguage"
                class="mt-5 max-w-5xl text-[clamp(2.2rem,5vw,4.65rem)] font-black leading-[1.02] tracking-[-0.035em] text-white"
              />
              <NTitleTransition
                v-if="alternateTitle"
                as="p"
                :text="alternateTitle"
                :transition-key="selectedLanguage"
                class="mt-3 text-base font-medium text-pink-200 sm:text-lg"
              />

              <div v-if="visibleAnimeGenres.length" class="mt-4 flex flex-wrap gap-2">
                <NuxtLink
                  v-for="genre in visibleAnimeGenres.slice(0, 5)"
                  :key="genre"
                  :to="`/genre/${encodeURIComponent(genre)}`"
                  class="rounded-full border border-pink-300/12 bg-pink-300/10 px-3 py-1.5 text-xs font-bold text-pink-200 no-underline transition hover:border-pink-300/35 hover:bg-pink-300/18"
                >
                  {{ genre }}
                </NuxtLink>
              </div>

              <div v-if="nextAiringLabel" class="mt-5 inline-flex items-center gap-2 text-sm font-bold text-pink-200">
                <span class="grid h-8 w-8 place-items-center rounded-full bg-pink-300/15 text-pink-300">
                  <div i-material-symbols-calendar-clock-rounded class="text-lg" />
                </span>
                <span>{{ nextAiringLabel }}</span>
              </div>

              <div
                class="mt-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:mt-6 sm:flex sm:flex-wrap sm:items-center sm:gap-3"
              >
                <NuxtLink
                  v-if="watchButtonTo"
                  :to="watchButtonTo"
                  class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-pink-300 px-5 py-3 text-sm font-black text-black no-underline shadow-lg shadow-pink-300/10 transition hover:-translate-y-0.5 hover:bg-pink-200 min-[420px]:col-span-2 sm:col-span-1 sm:w-auto"
                >
                  <div i-material-symbols-play-arrow-rounded class="text-2xl" />
                  {{ continueWatchingEntry ? 'Continue' : 'Watch' }} Episode {{ watchButtonEpisode }}
                </NuxtLink>

                <NuxtLink
                  v-if="nextUnwatchedTo && nextUnwatchedEpisode !== watchButtonEpisode"
                  :to="nextUnwatchedTo"
                  class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-bold text-white no-underline backdrop-blur-md transition hover:-translate-y-0.5 hover:border-pink-300/60 hover:text-pink-200 min-[420px]:col-span-2 sm:col-span-1 sm:w-auto"
                >
                  <div i-material-symbols-skip-next-rounded class="text-xl" />
                  Episode {{ nextUnwatchedEpisode }}
                </NuxtLink>

                <button
                  type="button"
                  class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold backdrop-blur-md transition hover:-translate-y-0.5 sm:w-auto"
                  :class="
                    isSaved
                      ? 'border-pink-300/45 bg-pink-300/15 text-pink-200'
                      : 'border-white/15 bg-white/8 text-white hover:border-pink-300/60 hover:text-pink-200'
                  "
                  :aria-label="isSaved ? 'Remove from watchlist' : 'Add to watchlist'"
                  @click="toggleSaved"
                >
                  <div
                    :class="
                      isSaved ? 'i-material-symbols-bookmark-added-rounded' : 'i-material-symbols-bookmark-add-rounded'
                    "
                    class="text-xl"
                  />
                  {{ isSaved ? 'In watchlist' : 'Add to watchlist' }}
                </button>

                <button
                  v-if="availableEpisodeNumbers.length"
                  type="button"
                  class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:border-pink-300/60 hover:text-pink-200 sm:w-auto"
                  @click="openProgressModal"
                >
                  <div i-material-symbols-edit-note-rounded class="text-xl" />
                  Progress
                </button>

                <button
                  v-if="trailerEmbedUrl"
                  type="button"
                  class="grid h-12 w-full place-items-center rounded-xl border border-white/15 bg-white/8 text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:border-pink-300/60 hover:text-pink-200 sm:w-12"
                  aria-label="Watch trailer"
                  @click="openTrailerModal"
                >
                  <div i-material-symbols-movie-outline-rounded class="text-xl" />
                </button>
              </div>

              <div class="mt-5 grid gap-3 sm:mt-7 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div v-if="quickStats.length" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div
                    v-for="stat in quickStats"
                    :key="stat.label"
                    class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md"
                  >
                    <p class="text-[10px] font-black uppercase tracking-[0.12em] text-white/45">{{ stat.label }}</p>
                    <p class="mt-1 text-lg font-extrabold text-white">{{ stat.value }}</p>
                  </div>
                </div>

                <button
                  v-if="animeProgress.total"
                  type="button"
                  class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-white backdrop-blur-md transition hover:border-pink-300/35"
                  @click="openProgressModal"
                >
                  <span class="flex items-center justify-between gap-3 text-xs font-bold">
                    <span>Your progress</span>
                    <span class="text-pink-300">{{ animeProgress.percent }}%</span>
                  </span>
                  <span class="mt-1 block text-sm font-extrabold">
                    {{ animeProgress.watched }} of {{ animeProgress.total }} watched
                  </span>
                  <span class="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
                    <span
                      class="block h-full rounded-full bg-pink-300"
                      :style="{ width: `${animeProgress.percent}%` }"
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        class="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-12"
      >
        <div class="min-w-0 space-y-8">
          <section class="rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/55 p-5 sm:p-6">
            <h2 class="text-2xl font-extrabold text-[var(--color-heading)]">Overview</h2>
            <p class="mt-5 whitespace-pre-line text-sm leading-7 text-[var(--color-text)]/72 sm:text-base">
              {{ cleanDescription }}
            </p>
          </section>

          <section class="rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/55 p-5 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-2xl font-extrabold text-[var(--color-heading)]">Anime Information</h2>
                <p class="mt-1 text-sm text-[var(--color-text)]/60">
                  Release, production, audience, and MyAnimeList details.
                </p>
              </div>
              <span
                v-if="anime.idMal"
                class="rounded-full border border-pink-300/15 bg-pink-300/10 px-3 py-1.5 text-xs font-bold text-pink-200"
              >
                MAL #{{ anime.idMal }}
              </span>
            </div>

            <dl class="mt-5 grid gap-x-8 gap-y-0 sm:grid-cols-2">
              <div
                v-for="[label, value] in detailRows"
                :key="label"
                class="flex items-start justify-between gap-4 border-b border-white/6 py-3"
              >
                <dt class="text-sm text-[var(--color-text)]/60">{{ label }}</dt>
                <dd class="max-w-[60%] text-right text-sm font-semibold text-[var(--color-heading)]">{{ value }}</dd>
              </div>
            </dl>
          </section>

          <section
            v-if="availableEpisodeNumbers.length"
            class="overflow-hidden rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/60 shadow-xl shadow-black/10"
          >
            <div class="p-5 sm:p-6">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-2xl font-extrabold text-[var(--color-heading)]">Episodes</h2>

                <div v-if="episodeRangeOptions.length > 1" class="relative">
                  <button
                    type="button"
                    class="inline-flex h-9 items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 text-xs font-bold text-[var(--color-text)] transition hover:border-pink-300 hover:text-pink-300"
                    :class="isEpisodeRangeOpen ? 'border-pink-300 text-pink-300' : ''"
                    :aria-expanded="isEpisodeRangeOpen"
                    aria-haspopup="menu"
                    aria-label="Select episode range"
                    @click="isEpisodeRangeOpen = !isEpisodeRangeOpen"
                  >
                    {{ selectedEpisodeRange?.label }}
                  </button>

                  <div
                    v-if="isEpisodeRangeOpen"
                    class="absolute right-0 top-full z-30 mt-2 max-h-72 w-56 overflow-y-auto overscroll-contain rounded border border-white/10 bg-[#201f34] p-1 shadow-xl shadow-black/40"
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
              </div>

              <div class="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p class="text-sm font-bold text-[var(--color-heading)]">{{ episodeAvailabilitySummary }}</p>
                  <div
                    v-if="plannedEpisodeCount > currentEpisodeCount"
                    class="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-white/8"
                  >
                    <div class="h-full rounded-full bg-pink-300" :style="{ width: `${releaseProgressPercent}%` }" />
                  </div>
                </div>
                <span
                  v-if="nextAiringLabel"
                  class="inline-flex items-center gap-2 rounded-full border border-pink-300/15 bg-pink-300/8 px-3 py-2 text-xs font-bold text-pink-200"
                >
                  <span class="h-2 w-2 animate-pulse rounded-full bg-pink-300" />
                  {{ nextAiringLabel }}
                </span>
              </div>

              <div
                :key="selectedEpisodeRange?.index"
                class="mt-5 grid max-h-[19rem] grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-[repeat(auto-fill,minmax(5rem,1fr))]"
              >
                <NuxtLink
                  v-for="episode in displayedEpisodeNumbers"
                  :key="episode"
                  :to="`/watch/${anime.id}?episode=${episode}&language=${defaultWatchLanguage}`"
                  :aria-label="`Watch episode ${episode}`"
                  class="inline-flex h-12 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-1.5 text-xs font-bold tabular-nums no-underline transition hover:-translate-y-0.5 hover:border-pink-300 hover:text-pink-300 sm:gap-1.5 sm:px-2 sm:text-sm"
                  :class="
                    isEpisodeWatched(episode)
                      ? 'border-emerald-300/50 bg-emerald-300/10 text-emerald-200'
                      : 'border-white/8 bg-[var(--color-background)]/65 text-[var(--color-text)]'
                  "
                >
                  <div
                    v-if="isEpisodeWatched(episode)"
                    i-material-symbols-check-circle-rounded
                    class="shrink-0 text-sm sm:text-base"
                  />
                  <span>{{ episode }}</span>
                </NuxtLink>
              </div>

              <p v-if="selectedEpisodeRange" class="mt-3 text-sm text-[var(--color-text)]/60">
                Showing {{ selectedEpisodeRange.episodes[0] }}–{{ selectedEpisodeRange.episodes.at(-1) }} of
                {{ availableEpisodeNumbers.length }} episodes
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3 border-t border-white/8 bg-black/8 px-5 py-4 sm:px-6">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl border-0 bg-pink-300 px-4 py-2.5 text-sm font-black text-black transition hover:bg-pink-200"
                @click="openProgressModal"
              >
                Update progress
              </button>
              <span class="text-sm text-[var(--color-text)]/60">
                {{ watchedEpisodeNumbers.size }} watched · {{ defaultWatchLanguage.toUpperCase() }}
              </span>
            </div>
          </section>

          <div
            v-if="visibleCharacters.length"
            class="rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/45 p-5 sm:p-6"
          >
            <h2 class="text-2xl font-extrabold text-[var(--color-heading)]">Characters</h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="character in visibleCharacters"
                :key="character.id"
                class="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-xl border border-white/8 bg-[var(--color-background)]/55 p-3"
              >
                <NRemoteImage
                  v-if="personImage(character)"
                  :src="personImage(character)"
                  :alt="personName(character)"
                  class="aspect-square w-16 rounded object-cover"
                  loading="lazy"
                />
                <div v-else class="aspect-square w-16 rounded bg-[var(--color-background-mute)]" />

                <div class="min-w-0">
                  <h3 class="line-clamp-1 font-bold text-[var(--color-heading)]">{{ personName(character) }}</h3>
                  <p v-if="character.role" class="mt-1 text-xs font-semibold text-pink-300">
                    {{ formatRole(character.role) }}
                  </p>

                  <div
                    v-if="character.voiceActor"
                    class="mt-3 grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2 rounded bg-[var(--color-background)] p-2"
                  >
                    <NRemoteImage
                      v-if="personImage(character.voiceActor)"
                      :src="personImage(character.voiceActor)"
                      :alt="personName(character.voiceActor)"
                      class="aspect-square w-9 rounded object-cover"
                      loading="lazy"
                    />
                    <div v-else class="aspect-square w-9 rounded bg-[var(--color-background-mute)]" />

                    <div class="min-w-0">
                      <p class="line-clamp-1 text-xs font-bold text-[var(--color-heading)]">
                        {{ personName(character.voiceActor) }}
                      </p>
                      <p class="text-xs text-[var(--color-text)]/55">
                        {{ character.voiceActor.language || 'Voice Actor' }}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div
            v-if="visibleStaff.length"
            class="rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/45 p-5 sm:p-6"
          >
            <h2 class="text-2xl font-extrabold text-[var(--color-heading)]">Staff</h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="staffMember in visibleStaff"
                :key="staffMember.id"
                class="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-xl border border-white/8 bg-[var(--color-background)]/55 p-3"
              >
                <NRemoteImage
                  v-if="personImage(staffMember)"
                  :src="personImage(staffMember)"
                  :alt="personName(staffMember)"
                  class="aspect-square w-14 rounded object-cover"
                  loading="lazy"
                />
                <div v-else class="aspect-square w-14 rounded bg-[var(--color-background-mute)]" />

                <div class="min-w-0">
                  <h3 class="line-clamp-1 font-bold text-[var(--color-heading)]">{{ personName(staffMember) }}</h3>
                  <p v-if="staffMember.role" class="mt-1 line-clamp-2 text-sm text-[var(--color-text)]/65">
                    {{ staffMember.role }}
                  </p>
                  <p
                    v-else-if="staffMember.primaryOccupations?.length"
                    class="mt-1 line-clamp-1 text-sm text-[var(--color-text)]/65"
                  >
                    {{ staffMember.primaryOccupations.join(', ') }}
                  </p>
                </div>
              </article>
            </div>
          </div>

          <div
            v-if="visibleRankings.length"
            class="rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/45 p-5 sm:p-6"
          >
            <h2 class="text-2xl font-extrabold text-[var(--color-heading)]">Rankings</h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div
                v-for="ranking in visibleRankings"
                :key="ranking.id"
                class="rounded-xl border border-white/8 bg-[var(--color-background)]/55 p-4"
              >
                <p class="text-2xl font-extrabold text-pink-300">#{{ ranking.rank }}</p>
                <p class="mt-1 font-semibold text-[var(--color-heading)]">{{ ranking.context }}</p>
                <p class="mt-2 text-sm text-[var(--color-text)]/60">
                  {{ formatText(ranking.type) }} &middot;
                  {{
                    ranking.allTime
                      ? 'All Time'
                      : [ranking.season ? formatText(ranking.season) : '', ranking.year].filter(Boolean).join(' ')
                  }}
                </p>
              </div>
            </div>
          </div>

          <div
            v-if="anime.synonyms?.length"
            class="rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/45 p-5 sm:p-6"
          >
            <h2 class="text-2xl font-extrabold text-[var(--color-heading)]">Alternative Titles</h2>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="synonym in anime.synonyms"
                :key="synonym"
                class="rounded-lg border border-white/8 bg-[var(--color-background)]/55 px-3 py-2 text-sm text-[var(--color-text)]"
              >
                {{ synonym }}
              </span>
            </div>
          </div>

          <div
            v-if="visibleStreamingEpisodes.length"
            class="rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/45 p-5 sm:p-6"
          >
            <h2 class="text-2xl font-extrabold text-[var(--color-heading)]">Official Streams</h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <NuxtLink
                v-for="episode in visibleStreamingEpisodes"
                :key="`${episode.site}-${episode.title}`"
                :to="episode.url"
                external
                target="_blank"
                rel="noreferrer"
                class="block rounded-xl border border-white/8 bg-[var(--color-background)]/55 p-4 text-[var(--color-text)] no-underline transition hover:border-pink-300/35 hover:text-pink-300"
              >
                <p class="line-clamp-2 font-semibold">{{ episode.title || 'Episode' }}</p>
                <p class="mt-2 text-sm text-[var(--color-text)]/60">{{ episode.site }}</p>
              </NuxtLink>
            </div>
          </div>
        </div>

        <aside class="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div
            v-if="anime.trailer?.thumbnail && trailerEmbedUrl"
            class="overflow-hidden rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/60 shadow-xl shadow-black/10"
          >
            <button
              type="button"
              class="group block w-full border-0 bg-transparent p-0 text-left text-[var(--color-text)]"
              @click="openTrailerModal"
            >
              <div class="relative aspect-video overflow-hidden">
                <NRemoteImage
                  :src="anime.trailer.thumbnail"
                  :alt="`${title} trailer`"
                  :placeholder-color="anime.coverImage?.color"
                  class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div class="absolute inset-0 grid place-items-center bg-black/35 transition group-hover:bg-black/20">
                  <div
                    class="grid h-12 w-12 place-items-center rounded-full bg-pink-300 text-black shadow-lg shadow-black/30 transition group-hover:scale-105"
                  >
                    <div i-material-symbols-play-arrow-rounded class="text-3xl" />
                  </div>
                </div>
              </div>
              <div class="p-4">
                <h2 class="font-bold text-[var(--color-heading)]">Trailer</h2>
                <p class="mt-1 text-sm text-[var(--color-text)]/60">Watch trailer</p>
              </div>
            </button>
          </div>

          <div
            v-if="visibleAnimeGenres.length"
            class="rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/60 p-5"
          >
            <h2 class="text-lg font-extrabold text-[var(--color-heading)]">Genres</h2>
            <div class="mt-4 flex flex-wrap gap-2">
              <NuxtLink
                v-for="genre in visibleAnimeGenres"
                :key="genre"
                :to="`/genre/${encodeURIComponent(genre)}`"
                class="rounded-full border border-pink-300/12 bg-pink-300/10 px-3 py-1.5 text-xs font-bold text-pink-200 no-underline transition hover:border-pink-300/35 hover:bg-pink-300/18"
              >
                {{ genre }}
              </NuxtLink>
            </div>
          </div>

          <div
            v-if="visibleExternalLinks.length"
            class="rounded-2xl border border-white/8 bg-[var(--color-background-soft)]/60 p-5"
          >
            <h2 class="text-lg font-extrabold text-[var(--color-heading)]">Links</h2>
            <div class="mt-4 grid gap-2">
              <NuxtLink
                v-for="link in visibleExternalLinks"
                :key="link.id"
                :to="link.url"
                external
                target="_blank"
                rel="noreferrer"
                class="flex items-center justify-between rounded-xl border border-white/6 bg-[var(--color-background)]/55 px-3 py-2.5 text-sm font-semibold text-[var(--color-text)] no-underline transition hover:border-pink-300/30 hover:text-pink-300"
              >
                <span>{{ link.site }}</span>
                <span class="text-xs text-[var(--color-text)]/50">{{ formatText(link.type) }}</span>
              </NuxtLink>
            </div>
          </div>
        </aside>
      </section>

      <Teleport to="body">
        <div
          v-if="isProgressModalOpen"
          class="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 sm:items-center sm:px-4 sm:py-6 sm:backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="progress-modal-title"
          @mousedown.self="closeProgressModal"
        >
          <div
            class="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-[var(--color-background-soft)] shadow-2xl shadow-black/50 sm:rounded-xl"
          >
            <div
              class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[var(--color-background-soft)] px-5 py-4"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 id="progress-modal-title" class="text-xl font-extrabold text-[var(--color-heading)]">
                    Update progress
                  </h2>
                  <span class="rounded bg-pink-300/15 px-2 py-1 text-[10px] font-black text-pink-200">
                    {{ defaultWatchLanguage.toUpperCase() }}
                  </span>
                </div>
                <p class="mt-1 line-clamp-1 text-sm text-[var(--color-text)]/60">{{ title }}</p>
              </div>

              <button
                type="button"
                class="grid h-9 w-9 shrink-0 place-items-center rounded border-0 bg-transparent text-[var(--color-heading)] transition hover:bg-[var(--color-background-mute)] hover:text-pink-300"
                aria-label="Close progress modal"
                @click="closeProgressModal"
              >
                <div i-material-symbols-close-rounded class="text-2xl" />
              </button>
            </div>

            <div class="p-5">
              <div class="rounded bg-[var(--color-background)] p-4">
                <div class="flex items-center justify-between gap-4 text-sm font-bold">
                  <span>{{ watchedEpisodeNumbers.size }} of {{ availableEpisodeNumbers.length }} watched</span>
                  <span class="text-pink-300">{{ currentLanguageProgressPercent }}%</span>
                </div>
                <div class="mt-3 h-2 overflow-hidden rounded bg-white/10">
                  <div
                    class="h-full rounded bg-pink-300 transition-[width]"
                    :style="{ width: `${currentLanguageProgressPercent}%` }"
                  />
                </div>
              </div>

              <form class="mt-5" @submit.prevent="setWatchedThroughEpisode">
                <label for="watched-through-episode" class="text-sm font-bold text-[var(--color-heading)]">
                  I’ve watched through episode
                </label>
                <div class="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input
                    id="watched-through-episode"
                    v-model.number="progressEpisodeInput"
                    type="number"
                    inputmode="numeric"
                    :min="firstAvailableEpisode"
                    :max="lastAvailableEpisode"
                    required
                    class="h-11 min-w-0 rounded border border-white/10 bg-[var(--color-background)] px-3 text-sm font-bold tabular-nums text-[var(--color-heading)] outline-none transition focus:border-pink-300 focus:ring-1 focus:ring-pink-300"
                  />
                  <button
                    type="submit"
                    class="rounded border-0 bg-pink-300 px-4 text-sm font-black text-black transition hover:opacity-85"
                  >
                    Save progress
                  </button>
                </div>
                <p class="mt-2 text-xs leading-5 text-[var(--color-text)]/55">
                  Episodes through this number will be watched. Later episodes will be marked unwatched for
                  {{ defaultWatchLanguage.toUpperCase() }}.
                </p>
              </form>

              <div class="my-5 flex items-center gap-3">
                <span class="h-px flex-1 bg-white/10" />
                <span class="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]/45">
                  Quick actions
                </span>
                <span class="h-px flex-1 bg-white/10" />
              </div>

              <div class="grid gap-2">
                <button
                  v-if="selectedEpisodeRange"
                  type="button"
                  class="flex items-center gap-3 rounded border border-white/10 bg-[var(--color-background)] px-4 py-3 text-left text-[var(--color-heading)] transition hover:border-pink-300/60 hover:text-pink-300"
                  @click="markSelectedRangeWatched"
                >
                  <div i-material-symbols-playlist-add-check-rounded class="shrink-0 text-2xl text-pink-300" />
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-bold">Mark range {{ selectedEpisodeRange.label }} watched</span>
                    <span class="mt-1 block text-xs text-[var(--color-text)]/55">
                      {{ getEpisodeRangeWatchedCount(selectedEpisodeRange.episodes) }} of
                      {{ selectedEpisodeRange.episodes.length }} already watched
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  class="flex items-center gap-3 rounded border border-white/10 bg-[var(--color-background)] px-4 py-3 text-left text-[var(--color-heading)] transition hover:border-pink-300/60 hover:text-pink-300"
                  @click="progressConfirmationAction = 'complete'"
                >
                  <div i-material-symbols-done-all-rounded class="shrink-0 text-2xl text-pink-300" />
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-bold">Mark all episodes watched</span>
                    <span class="mt-1 block text-xs text-[var(--color-text)]/55">
                      Complete all {{ availableEpisodeNumbers.length }} available episodes
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  class="flex items-center gap-3 rounded border border-red-300/15 bg-red-300/5 px-4 py-3 text-left text-red-200 transition hover:border-red-300/45 hover:bg-red-300/10 disabled:pointer-events-none disabled:opacity-40"
                  :disabled="watchedEpisodeNumbers.size === 0"
                  @click="progressConfirmationAction = 'clear'"
                >
                  <div i-material-symbols-delete-sweep-rounded class="shrink-0 text-2xl" />
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-bold">Clear watched progress</span>
                    <span class="mt-1 block text-xs text-red-200/60">
                      Remove watched status from {{ defaultWatchLanguage.toUpperCase() }} episodes
                    </span>
                  </span>
                </button>
              </div>

              <div
                v-if="progressConfirmationAction"
                class="mt-5 rounded border p-4"
                :class="
                  progressConfirmationAction === 'clear'
                    ? 'border-red-300/25 bg-red-300/8'
                    : 'border-pink-300/25 bg-pink-300/8'
                "
              >
                <p class="text-sm font-bold text-[var(--color-heading)]">
                  {{
                    progressConfirmationAction === 'clear'
                      ? `Clear ${watchedEpisodeNumbers.size} watched episodes?`
                      : `Mark all ${availableEpisodeNumbers.length} episodes watched?`
                  }}
                </p>
                <p class="mt-1 text-xs leading-5 text-[var(--color-text)]/60">
                  {{
                    progressConfirmationAction === 'clear'
                      ? `This only clears ${defaultWatchLanguage.toUpperCase()} watched progress for this anime.`
                      : 'This will set the anime progress to 100%.'
                  }}
                </p>
                <div class="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    class="rounded border-0 bg-white/8 px-4 py-2 text-xs font-black text-[var(--color-heading)] transition hover:text-pink-300"
                    @click="progressConfirmationAction = null"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="rounded border-0 px-4 py-2 text-xs font-black transition hover:opacity-85"
                    :class="progressConfirmationAction === 'clear' ? 'bg-red-300 text-black' : 'bg-pink-300 text-black'"
                    @click="confirmProgressAction"
                  >
                    {{ progressConfirmationAction === 'clear' ? 'Clear progress' : 'Mark all watched' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="isTrailerModalOpen"
          class="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          :aria-label="`${title} trailer`"
          @click.self="closeTrailerModal"
        >
          <div class="w-full max-w-5xl overflow-hidden rounded bg-[var(--color-background)] shadow-2xl shadow-black/50">
            <div class="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
              <NTitleTransition
                as="h2"
                :text="`${title} Trailer`"
                :transition-key="selectedLanguage"
                class="line-clamp-1 font-bold text-[var(--color-heading)]"
              />
              <button
                type="button"
                class="grid h-9 w-9 place-items-center rounded border-0 bg-white/10 text-white transition hover:bg-pink-300 hover:text-black"
                aria-label="Close trailer"
                @click="closeTrailerModal"
              >
                <div i-material-symbols-close-rounded class="text-xl" />
              </button>
            </div>
            <div class="aspect-video bg-black">
              <iframe
                v-if="trailerEmbedUrl"
                :src="trailerEmbedUrl"
                :title="`${title} trailer`"
                class="h-full w-full border-0"
                allow="
                  accelerometer;
                  autoplay;
                  clipboard-write;
                  encrypted-media;
                  gyroscope;
                  picture-in-picture;
                  web-share;
                "
                allowfullscreen
              />
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </main>
</template>
