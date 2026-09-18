<script setup lang="ts">
type FilterAnime = {
  id: number
  title: string
  romajiTitle: string
  type: string
  status: string
  episodes: number
  year: number | string
  score: number
  date: string
  genres: string[]
  image: string
  matchedTitle?: string
  sortTitle?: string
}

type FilterResponse = {
  pageInfo?: {
    total?: number
    currentPage?: number
    hasNextPage?: boolean
  }
  results: FilterAnime[]
}

type CatalogResponse = {
  results: FilterAnime[]
}

type HomeDiscoverResponse = {
  genres: string[]
}

type FilterKey = 'search' | 'genre' | 'season' | 'year' | 'type' | 'status' | 'rating' | 'sort'

const route = useRoute()
const router = useRouter()
const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))
const { isAnimeSaved, toggleAnimeSaved } = useAnimeWatchlist()
const hasMounted = useMounted()

const getQueryValue = (value: unknown, fallback = '') => {
  if (Array.isArray(value)) {
    return value[0] ? String(value[0]) : fallback
  }

  return value ? String(value) : fallback
}

const search = ref(getQueryValue(route.query.search))
const genre = ref(getQueryValue(route.query.genre))
const season = ref(getQueryValue(route.query.season))
const year = ref(getQueryValue(route.query.year))
const type = ref(getQueryValue(route.query.type))
const status = ref(getQueryValue(route.query.status))
const rating = ref(getQueryValue(route.query.rating))
const sort = ref(getQueryValue(route.query.sort, 'default'))
const supportedQueryKeys = new Set<string>([
  'search',
  'genre',
  'season',
  'year',
  'type',
  'status',
  'rating',
  'sort',
  'page',
])

const currentPage = computed(() => {
  const value = Number(route.query.page || 1)

  return Number.isInteger(value) && value > 0 ? value : 1
})

const currentQuery = computed(() => {
  const params = new URLSearchParams()

  Object.entries(route.query).forEach(([key, value]) => {
    if (!supportedQueryKeys.has(key)) {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) params.append(key, item)
      })
      return
    }

    if (value) params.set(key, String(value))
  })

  return params.toString()
})

const { data: discoverData } = await useFetch<HomeDiscoverResponse>('/api/myanimelist/home-discover', {
  default: () => ({
    genres: [],
  }),
  server: false,
})

const { data, pending, error } = await useFetch<FilterResponse>(
  () => `/api/myanimelist/filter${currentQuery.value ? `?${currentQuery.value}` : ''}`,
  {
    key: () => `filter-${currentQuery.value || 'default'}`,
    default: () => ({
      pageInfo: {
        total: 0,
        currentPage: 1,
        hasNextPage: false,
      },
      results: [],
    }),
    server: false,
  },
)

const { data: topRatedData, pending: topRatedPending } = await useFetch<CatalogResponse>(
  '/api/myanimelist/catalog?category=you-may-also-watch&perPage=8',
  {
    key: 'filter-top-rated-v1',
    default: () => ({
      results: [],
    }),
    server: false,
  },
)

const animeResults = computed(() => data.value?.results || [])
const totalResults = computed(() => data.value?.pageInfo?.total || 0)
const hasNextPage = computed(() => Boolean(data.value?.pageInfo?.hasNextPage))
const activeSearchTerm = computed(() => getQueryValue(route.query.search).trim())
const genreOptions = computed(() => discoverData.value?.genres || [])
const topRatedItems = computed(() => topRatedData.value?.results?.slice(0, 8) || [])
const activeFilterKeys: FilterKey[] = ['search', 'genre', 'season', 'year', 'type', 'status', 'rating', 'sort']
const filterNames: Record<FilterKey, string> = {
  search: 'Search',
  genre: 'Genre',
  season: 'Season',
  year: 'Year',
  type: 'Type',
  status: 'Status',
  rating: 'Rating',
  sort: 'Sort',
}
const filterValueNames: Record<string, string> = {
  WINTER: 'Winter',
  SPRING: 'Spring',
  SUMMER: 'Summer',
  FALL: 'Fall',
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  RELEASING: 'Releasing',
  FINISHED: 'Finished',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'Hiatus',
  '50': '50%+',
  '60': '60%+',
  '70': '70%+',
  '80': '80%+',
  '90': '90%+',
  trending: 'Trending',
  popular: 'Popular',
  score: 'Highest score',
  newest: 'Newest',
  updated: 'Recently updated',
}
const activeFilters = computed(() => {
  return activeFilterKeys.flatMap((key) => {
    const value = getQueryValue(route.query[key]).trim()

    if (!value || (key === 'sort' && value === 'default')) {
      return []
    }

    const displayValue = filterValueNames[value] || value

    return [
      {
        key,
        label: key === 'search' ? `${filterNames[key]}: “${displayValue}”` : `${filterNames[key]}: ${displayValue}`,
      },
    ]
  })
})
const activeFilterCount = computed(() => activeFilters.value.length)
const hasFilterDraft = computed(() => {
  return Boolean(
    search.value.trim() ||
    genre.value ||
    season.value ||
    year.value ||
    type.value ||
    status.value ||
    rating.value ||
    (sort.value && sort.value !== 'default'),
  )
})
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear() + 1

  return Array.from({ length: currentYear - 1969 }, (_, index) => currentYear - index)
})
const previousPageTo = computed(() => {
  if (currentPage.value <= 1) return ''

  const params = new URLSearchParams(currentQuery.value)
  const previousPage = currentPage.value - 1

  if (previousPage > 1) {
    params.set('page', String(previousPage))
  } else {
    params.delete('page')
  }

  const query = params.toString()

  return `/filter${query ? `?${query}` : ''}`
})
const nextPageTo = computed(() => {
  if (!hasNextPage.value) return ''

  const params = new URLSearchParams(currentQuery.value)
  params.set('page', String(currentPage.value + 1))

  return `/filter?${params.toString()}`
})

const applyFilters = () => {
  const query: Record<string, string> = {}

  if (search.value.trim()) query.search = search.value.trim()
  if (genre.value) query.genre = genre.value
  if (season.value) query.season = season.value
  if (year.value) query.year = year.value
  if (type.value) query.type = type.value
  if (status.value) query.status = status.value
  if (rating.value) query.rating = rating.value
  if (sort.value && sort.value !== 'default') query.sort = sort.value

  router.push({
    path: '/filter',
    query,
  })
}

const resetFilters = () => {
  search.value = ''
  genre.value = ''
  season.value = ''
  year.value = ''
  type.value = ''
  status.value = ''
  rating.value = ''
  sort.value = 'default'

  router.push('/filter')
}

const clearAppliedFilter = (key: FilterKey) => {
  const { [key]: _removedFilter, page: _removedPage, ...query } = route.query

  router.push({
    path: '/filter',
    query,
  })
}

const syncFiltersFromRoute = () => {
  search.value = getQueryValue(route.query.search)
  genre.value = getQueryValue(route.query.genre)
  season.value = getQueryValue(route.query.season)
  year.value = getQueryValue(route.query.year)
  type.value = getQueryValue(route.query.type)
  status.value = getQueryValue(route.query.status)
  rating.value = getQueryValue(route.query.rating)
  sort.value = getQueryValue(route.query.sort, 'default')
}

const getAnimeTitle = (anime: FilterAnime) => {
  return selectedLanguage.value === 'EN' ? anime.title : anime.romajiTitle
}

const normalizeTitleText = (value: string) => {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

const toSearchComparable = (value: string) => {
  return normalizeTitleText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

const toLooseSearchComparable = (value: string) => {
  return toSearchComparable(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const isTitleSearchMatch = (title: string, query: string) => {
  const comparableTitle = toSearchComparable(title)
  const comparableQuery = toSearchComparable(query)

  if (!comparableTitle || !comparableQuery) {
    return false
  }

  if (comparableTitle.includes(comparableQuery)) {
    return true
  }

  const looseTitle = toLooseSearchComparable(title)
  const looseQuery = toLooseSearchComparable(query)

  return Boolean(looseTitle && looseQuery && looseTitle.includes(looseQuery))
}

const getSearchMatchedTitle = (anime: FilterAnime) => {
  const query = activeSearchTerm.value

  if (!query) {
    return ''
  }

  const matchedTitle = anime.sortTitle?.trim() || anime.matchedTitle?.trim() || ''

  return matchedTitle && isTitleSearchMatch(matchedTitle, query) ? matchedTitle : ''
}

const hasSearchMatch = (anime: FilterAnime) => {
  return Boolean(getSearchSortedAsTitle(anime))
}

const getSearchSortedAsTitle = (anime: FilterAnime) => {
  const matchedTitle = getSearchMatchedTitle(anime)

  if (!matchedTitle || normalizeTitleText(matchedTitle) === normalizeTitleText(getAnimeTitle(anime))) {
    return ''
  }

  return matchedTitle
}

const getAnimeScore = (anime: FilterAnime) => {
  return anime.score ? (anime.score / 10).toFixed(1) : '0.0'
}

const getAnimeMeta = (anime: FilterAnime) => {
  return [anime.type, anime.year || anime.date, anime.episodes ? `${anime.episodes} eps` : '']
    .filter(Boolean)
    .join(' • ')
}

const toggleSaved = (anime: FilterAnime) => {
  toggleAnimeSaved({
    id: anime.id,
    title: getAnimeTitle(anime),
    image: anime.image,
    episodes: anime.episodes,
  })
}

const getHighlightedTitleParts = (title: string) => {
  const query = activeSearchTerm.value

  if (!query) {
    return [{ text: title, match: false }]
  }

  const matchIndex = title.toLowerCase().indexOf(query.toLowerCase())

  if (matchIndex === -1) {
    return [{ text: title, match: false }]
  }

  return [
    { text: title.slice(0, matchIndex), match: false },
    { text: title.slice(matchIndex, matchIndex + query.length), match: true },
    { text: title.slice(matchIndex + query.length), match: false },
  ].filter((part) => part.text)
}

const selectClass = 'filter-select'
const filterButtonClass = 'filter-apply-button'

watch(() => route.query, syncFiltersFromRoute)

useSeoMeta({
  title: 'Filter Anime - Noxy',
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)] px-4 py-20 text-[var(--color-text)] sm:px-6 lg:px-8">
    <div class="mx-auto max-w-[1760px]">
      <div class="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section class="min-w-0">
          <form class="filter-panel" @submit.prevent="applyFilters">
            <header class="filter-header">
              <div class="flex min-w-0 items-center gap-3.5 sm:gap-4">
                <span class="filter-title-icon">
                  <div i-material-symbols-tune-rounded class="text-[1.7rem]" />
                </span>

                <div class="min-w-0">
                  <p class="filter-eyebrow">Discover your next watch</p>
                  <h1 class="filter-title">Filter anime</h1>
                  <p class="filter-subtitle">Shape the catalog around your mood, format, and season.</p>
                </div>
              </div>

              <div class="flex shrink-0 flex-wrap items-center gap-2">
                <span class="filter-result-pill" aria-live="polite">
                  <span class="filter-result-dot" />
                  <strong>{{ totalResults.toLocaleString() }}</strong>
                  <span>results</span>
                </span>

                <button v-if="hasFilterDraft" type="button" class="filter-header-reset" @click="resetFilters">
                  <div i-material-symbols-restart-alt-rounded class="text-lg" />
                  Reset
                </button>
              </div>
            </header>

            <div class="filter-body">
              <section class="filter-search-section" aria-labelledby="filter-search-label">
                <div class="filter-section-heading">
                  <div>
                    <p id="filter-search-label" class="filter-section-title">Search by title</p>
                    <p class="filter-section-copy">English, romaji, and alternative titles are supported.</p>
                  </div>
                  <span class="filter-step-badge">01</span>
                </div>

                <div class="filter-search-control" :class="{ 'filter-search-control--active': search.trim() }">
                  <div i-material-symbols-search-rounded class="filter-search-icon" />
                  <input
                    id="anime-filter-search"
                    v-model="search"
                    type="search"
                    aria-labelledby="filter-search-label"
                    placeholder="Try “Frieren”, “One Piece”, or “Solo Leveling”"
                    class="filter-search-input"
                    autocomplete="off"
                    spellcheck="false"
                  />
                  <kbd v-if="!search" class="filter-enter-hint">Enter</kbd>
                  <button
                    v-else
                    type="button"
                    class="filter-search-clear"
                    aria-label="Clear filter search"
                    @click="search = ''"
                  >
                    <div i-material-symbols-close-rounded class="text-lg" />
                  </button>
                </div>
              </section>

              <div v-if="activeFilters.length" class="filter-active-row">
                <div class="filter-active-label">
                  <div i-material-symbols-check-circle-rounded class="text-base" />
                  Applied
                </div>
                <div class="flex min-w-0 flex-1 flex-wrap gap-2">
                  <button
                    v-for="item in activeFilters"
                    :key="item.key"
                    type="button"
                    class="filter-chip"
                    :aria-label="`Remove ${item.label} filter`"
                    @click="clearAppliedFilter(item.key)"
                  >
                    <span class="max-w-56 truncate">{{ item.label }}</span>
                    <div i-material-symbols-close-rounded class="shrink-0 text-sm" />
                  </button>
                </div>
              </div>

              <div class="filter-groups">
                <fieldset class="filter-group filter-group--catalog">
                  <legend class="sr-only">Catalog details</legend>
                  <div class="filter-group-heading">
                    <span class="filter-group-icon">
                      <div i-material-symbols-category-rounded class="text-xl" />
                    </span>
                    <div>
                      <h2>Catalog details</h2>
                      <p>Choose the genre and format you want to explore.</p>
                    </div>
                    <span class="filter-step-badge">02</span>
                  </div>

                  <div class="filter-field-grid">
                    <label class="filter-field">
                      <span class="filter-label">
                        <div i-material-symbols-interests-rounded class="text-base" />
                        Genre
                      </span>
                      <select v-model="genre" :class="selectClass">
                        <option value="">All genres</option>
                        <option v-for="item in genreOptions" :key="item" :value="item">
                          {{ item }}
                        </option>
                      </select>
                    </label>

                    <label class="filter-field">
                      <span class="filter-label">
                        <div i-material-symbols-movie-outline-rounded class="text-base" />
                        Type
                      </span>
                      <select v-model="type" :class="selectClass">
                        <option value="">All types</option>
                        <option value="TV">TV</option>
                        <option value="TV_SHORT">TV Short</option>
                        <option value="MOVIE">Movie</option>
                        <option value="SPECIAL">Special</option>
                        <option value="OVA">OVA</option>
                      </select>
                    </label>
                  </div>
                </fieldset>

                <fieldset class="filter-group filter-group--release">
                  <legend class="sr-only">Release and score</legend>
                  <div class="filter-group-heading">
                    <span class="filter-group-icon">
                      <div i-material-symbols-calendar-month-rounded class="text-xl" />
                    </span>
                    <div>
                      <h2>Release &amp; score</h2>
                      <p>Dial in when it aired and how it was received.</p>
                    </div>
                    <span class="filter-step-badge">03</span>
                  </div>

                  <div class="filter-field-grid">
                    <label class="filter-field">
                      <span class="filter-label">
                        <div i-material-symbols-severe-cold-rounded class="text-base" />
                        Season
                      </span>
                      <select v-model="season" :class="selectClass">
                        <option value="">All seasons</option>
                        <option value="WINTER">Winter</option>
                        <option value="SPRING">Spring</option>
                        <option value="SUMMER">Summer</option>
                        <option value="FALL">Fall</option>
                      </select>
                    </label>

                    <label class="filter-field">
                      <span class="filter-label">
                        <div i-material-symbols-event-rounded class="text-base" />
                        Year
                      </span>
                      <select v-model="year" :class="selectClass">
                        <option value="">All years</option>
                        <option v-for="item in yearOptions" :key="item" :value="String(item)">
                          {{ item }}
                        </option>
                      </select>
                    </label>

                    <label class="filter-field">
                      <span class="filter-label">
                        <div i-material-symbols-radio-button-checked-rounded class="text-base" />
                        Status
                      </span>
                      <select v-model="status" :class="selectClass">
                        <option value="">All statuses</option>
                        <option value="RELEASING">Releasing</option>
                        <option value="FINISHED">Finished</option>
                        <option value="NOT_YET_RELEASED">Upcoming</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="HIATUS">Hiatus</option>
                      </select>
                    </label>

                    <label class="filter-field">
                      <span class="filter-label">
                        <div i-material-symbols-star-rounded class="text-base" />
                        Minimum rating
                      </span>
                      <select v-model="rating" :class="selectClass">
                        <option value="">Any rating</option>
                        <option value="50">50%+</option>
                        <option value="60">60%+</option>
                        <option value="70">70%+</option>
                        <option value="80">80%+</option>
                        <option value="90">90%+</option>
                      </select>
                    </label>
                  </div>
                </fieldset>
              </div>

              <div class="filter-toolbar">
                <label class="filter-field filter-sort-field">
                  <span class="filter-label">
                    <div i-material-symbols-swap-vert-rounded class="text-base" />
                    Sort results
                  </span>
                  <select v-model="sort" :class="selectClass">
                    <option value="default">Default order</option>
                    <option value="trending">Trending</option>
                    <option value="popular">Popular</option>
                    <option value="score">Highest Score</option>
                    <option value="newest">Newest</option>
                    <option value="updated">Recently Updated</option>
                  </select>
                </label>

                <div class="filter-status-copy">
                  <span class="filter-status-icon" :class="{ 'filter-status-icon--active': activeFilterCount }">
                    <div v-if="activeFilterCount" i-material-symbols-filter-alt-rounded />
                    <div v-else i-material-symbols-explore-rounded />
                  </span>
                  <p>
                    <strong v-if="activeFilterCount">
                      {{ activeFilterCount }} active {{ activeFilterCount === 1 ? 'filter' : 'filters' }}
                    </strong>
                    <strong v-else>Browsing the full catalog</strong>
                    <span>
                      {{
                        activeFilterCount
                          ? 'Fine-tune or remove filters above.'
                          : 'Add filters when you want to narrow it down.'
                      }}
                    </span>
                  </p>
                </div>

                <div class="filter-action-buttons">
                  <button v-if="hasFilterDraft" type="button" class="filter-clear-button" @click="resetFilters">
                    <div i-material-symbols-filter-alt-off-rounded class="text-lg" />
                    Clear
                  </button>
                  <button type="submit" :class="filterButtonClass">
                    <div i-material-symbols-travel-explore-rounded class="text-xl" />
                    Apply filters
                    <div i-material-symbols-arrow-forward-rounded class="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div class="mt-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-xl font-extrabold text-[var(--color-heading)] sm:text-2xl">Anime results</h2>
              <p class="mt-1 text-xs text-[var(--color-text)]/50">
                Browse the current matches and open a title for complete details.
              </p>
            </div>
            <span
              class="inline-flex w-fit items-center gap-2 rounded-full border border-white/8 bg-[var(--color-background-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-heading)]"
            >
              <div i-material-symbols-grid-view-rounded class="text-base text-pink-300" />
              Page {{ currentPage }} · {{ totalResults.toLocaleString() }} results
            </span>
          </div>

          <NAnimeGridSkeleton v-if="!hasMounted || pending" />

          <div v-else-if="error" class="mt-8 rounded bg-[var(--color-background-soft)] p-6 text-red-300">
            {{ error.statusMessage || 'Unable to load filter results.' }}
          </div>

          <NVirtualAnimeGrid
            v-else-if="animeResults.length"
            :items="animeResults"
            class="mt-6"
            :min-column-width="140"
            :max-columns="6"
            :estimated-item-height="400"
            :virtualize-at="100"
          >
            <template #default="{ item: anime }">
              <NAnimeHoverCard v-if="anime" :anime-id="anime.id">
                <NuxtLink :to="`/anime/${anime.id}`" class="group block text-[var(--color-text)] no-underline">
                <div
                  class="relative overflow-hidden rounded bg-[var(--color-background-soft)] ring-1 ring-white/0 transition duration-300 group-hover:ring-pink-300/35"
                >
                  <NRemoteImage
                    :src="anime.image"
                    :alt="getAnimeTitle(anime)"
                    class="aspect-[2/3] w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  <span
                    v-if="hasSearchMatch(anime)"
                    class="absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded bg-[#3a273d]/95 px-2 py-1 text-[10px] font-black text-pink-100 shadow-lg shadow-black/30 ring-1 ring-pink-300/25 backdrop-blur-sm"
                  >
                    <span class="min-w-0 truncate text-pink-300">{{ activeSearchTerm }}</span>
                    <span class="shrink-0">match</span>
                  </span>

                  <div
                    v-if="getSearchSortedAsTitle(anime)"
                    class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-2 pb-2 pt-10"
                  >
                    <span
                      class="flex max-w-full items-center gap-1.5 rounded bg-[#3a273d]/95 px-2 py-1 text-[10px] font-bold text-pink-100 shadow-lg shadow-black/30 ring-1 ring-pink-300/25 backdrop-blur-sm"
                    >
                      <span class="shrink-0 text-pink-300">Sorted as</span>
                      <span class="min-w-0 truncate text-white">{{ getSearchSortedAsTitle(anime) }}</span>
                    </span>
                  </div>
                </div>

                <NTitleTransition
                  as="h2"
                  :transition-key="`${selectedLanguage}-${anime.id}`"
                  class="mt-3 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[var(--color-heading)] transition group-hover:text-pink-300"
                >
                  <span
                    v-for="(part, partIndex) in getHighlightedTitleParts(getAnimeTitle(anime))"
                    :key="`${part.text}-${partIndex}`"
                    :class="part.match ? 'text-pink-300' : ''"
                  >
                    {{ part.text }}
                  </span>
                </NTitleTransition>

                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text)]/70">
                  <span>{{ anime.type }}</span>
                  <span v-if="anime.year || anime.date" class="text-[var(--color-text)]/40">•</span>
                  <span v-if="anime.year || anime.date">{{ anime.year || anime.date }}</span>
                  <span v-if="anime.score" class="text-[var(--color-text)]/40">•</span>
                  <span v-if="anime.score">{{ anime.score }}%</span>
                </div>

                <div v-if="anime.genres.length" class="mt-3 flex flex-wrap gap-1.5">
                  <span
                    v-for="item in anime.genres.slice(0, 2)"
                    :key="item"
                    class="rounded bg-pink-300/15 px-2 py-0.5 text-[11px] font-semibold text-pink-300"
                  >
                    {{ item }}
                  </span>
                </div>
                </NuxtLink>
              </NAnimeHoverCard>
            </template>
          </NVirtualAnimeGrid>

          <NEmptyResults
            v-else
            title="No anime matched those filters"
            message="Try clearing the current filters, changing the search term, or browsing the full anime catalog."
          >
            <template #actions>
              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded bg-pink-300 px-5 py-3 text-sm font-bold text-black transition hover:opacity-85"
                @click="resetFilters"
              >
                <div i-material-symbols-filter-alt-off-rounded class="text-lg" />
                <span>Reset filters</span>
              </button>

              <NuxtLink
                to="/az/all"
                class="inline-flex items-center justify-center gap-2 rounded bg-[var(--color-background-mute)] px-5 py-3 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:text-pink-300"
              >
                <div i-material-symbols-sort-by-alpha-rounded class="text-lg" />
                <span>Browse A-Z</span>
              </NuxtLink>
            </template>
          </NEmptyResults>

          <div
            v-if="!pending && !error && (previousPageTo || nextPageTo)"
            class="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <NuxtLink
              v-if="previousPageTo"
              :to="previousPageTo"
              class="rounded bg-[var(--color-background-soft)] px-5 py-3 text-sm font-bold text-[var(--color-text)] no-underline transition hover:text-pink-300"
            >
              Previous
            </NuxtLink>

            <span class="rounded bg-[var(--color-background-soft)] px-5 py-3 text-sm font-bold text-pink-300">
              Page {{ currentPage }}
            </span>

            <NuxtLink
              v-if="nextPageTo"
              :to="nextPageTo"
              class="rounded bg-pink-300 px-5 py-3 text-sm font-bold text-black no-underline transition hover:opacity-85"
            >
              Next
            </NuxtLink>
          </div>
        </section>

        <aside class="min-w-0">
          <div class="mb-5 flex items-center justify-between gap-4">
            <h2 class="text-2xl font-extrabold leading-none text-pink-300">Top Rated</h2>
            <NuxtLink
              to="/category/you-may-also-watch"
              class="inline-flex items-center gap-1 text-sm font-bold text-pink-300 no-underline transition hover:text-pink-200"
            >
              <span>View more</span>
              <div i-material-symbols-chevron-right-rounded class="text-lg" />
            </NuxtLink>
          </div>

          <div v-if="!hasMounted || topRatedPending" class="rounded bg-[var(--color-background-soft)] p-4">
            <div v-for="item in 6" :key="item" class="flex gap-4 border-b border-white/10 py-4 last:border-b-0">
              <div class="h-18 w-14 shrink-0 animate-pulse rounded bg-white/10" />
              <div class="min-w-0 flex-1 space-y-3 py-1">
                <div class="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                <div class="h-3 w-1/2 animate-pulse rounded bg-white/10" />
              </div>
            </div>
          </div>

          <div v-else-if="topRatedItems.length" class="overflow-hidden rounded bg-[var(--color-background-soft)]">
            <NAnimeHoverCard v-for="anime in topRatedItems" :key="anime.id" :anime-id="anime.id">
              <div
                class="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--color-border)] px-4 py-4 last:border-b-0"
              >
                <NuxtLink :to="`/anime/${anime.id}`" class="group contents text-[var(--color-text)] no-underline">
                  <NRemoteImage
                    :src="anime.image"
                    :alt="getAnimeTitle(anime)"
                    class="h-20 w-14 rounded object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  <div class="min-w-0">
                    <NTitleTransition
                      as="h3"
                      :text="getAnimeTitle(anime)"
                      :transition-key="`${selectedLanguage}-${anime.id}`"
                      class="truncate text-sm font-bold leading-5 text-[var(--color-heading)] transition group-hover:text-pink-300"
                    />
                    <p class="mt-2 flex min-w-0 items-center gap-2 text-xs text-[var(--color-text)]/65">
                      <span class="inline-flex shrink-0 items-center gap-1 text-[var(--color-heading)]/90">
                        <div i-material-symbols-star-rounded class="text-base" />
                        {{ getAnimeScore(anime) }}
                      </span>
                      <span class="text-[var(--color-text)]/35">•</span>
                      <span class="min-w-0 truncate">{{ getAnimeMeta(anime) }}</span>
                    </p>
                  </div>
                </NuxtLink>

                <button
                  type="button"
                  class="grid h-8 w-8 shrink-0 place-items-center border-0 bg-transparent text-2xl font-black leading-none text-[var(--color-text)]/65 outline-none transition hover:bg-transparent hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                  :title="isAnimeSaved(anime.id) ? 'Remove from watchlist' : 'Add to watchlist'"
                  :aria-label="
                    isAnimeSaved(anime.id)
                      ? `Remove ${getAnimeTitle(anime)} from watchlist`
                      : `Add ${getAnimeTitle(anime)} to watchlist`
                  "
                  @click="toggleSaved(anime)"
                >
                  {{ isAnimeSaved(anime.id) ? '-' : '+' }}
                </button>
              </div>
            </NAnimeHoverCard>
          </div>
        </aside>
      </div>
    </div>
  </main>
</template>

<style scoped>
.filter-panel {
  --ctp-rosewater: #f5e0dc;
  --ctp-pink: #f5c2e7;
  --ctp-mauve: #cba6f7;
  --ctp-green: #a6e3a1;
  --ctp-sky: #89dceb;
  --ctp-text: #cdd6f4;
  --ctp-subtext1: #bac2de;
  --ctp-subtext0: #a6adc8;
  --ctp-overlay2: #9399b2;
  --ctp-overlay1: #7f849c;
  --ctp-overlay0: #6c7086;
  --ctp-surface1: #45475a;
  --ctp-surface0: #313244;
  --ctp-mantle: #181825;
  --ctp-crust: #11111b;

  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid rgb(205 214 244 / 10%);
  border-radius: 1.75rem;
  color: var(--ctp-text);
  background:
    radial-gradient(circle at 8% 0%, rgb(245 194 231 / 9%), transparent 25rem),
    radial-gradient(circle at 92% 4%, rgb(203 166 247 / 8%), transparent 24rem),
    linear-gradient(145deg, rgb(30 30 46 / 98%), rgb(24 24 37 / 98%));
  box-shadow:
    0 30px 80px rgb(17 17 27 / 34%),
    inset 0 1px 0 rgb(255 255 255 / 3%);
}

.filter-panel::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image:
    linear-gradient(rgb(205 214 244 / 2%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(205 214 244 / 2%) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(to bottom, black, transparent 72%);
  content: '';
  pointer-events: none;
}

.filter-panel::after {
  position: absolute;
  top: 0;
  right: 2rem;
  left: 2rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ctp-pink), var(--ctp-mauve), transparent);
  content: '';
  opacity: 0.62;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  border-bottom: 1px solid rgb(205 214 244 / 8%);
  padding: 1.4rem 1.5rem;
  background: rgb(17 17 27 / 22%);
  backdrop-filter: blur(18px);
}

.filter-title-icon {
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  flex: none;
  place-items: center;
  border: 1px solid rgb(245 194 231 / 20%);
  border-radius: 1rem;
  color: var(--ctp-pink);
  background: linear-gradient(145deg, rgb(245 194 231 / 15%), rgb(203 166 247 / 7%));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 7%),
    0 12px 30px rgb(17 17 27 / 24%);
}

.filter-eyebrow,
.filter-section-title {
  margin: 0;
  color: var(--ctp-pink);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  line-height: 1.2;
  text-transform: uppercase;
}

.filter-title {
  margin: 0.3rem 0 0;
  color: var(--ctp-rosewater);
  font-size: clamp(1.35rem, 2vw, 1.75rem);
  font-weight: 850;
  letter-spacing: -0.035em;
  line-height: 1.05;
}

.filter-subtitle,
.filter-section-copy {
  margin: 0.35rem 0 0;
  color: var(--ctp-subtext0);
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.5;
}

.filter-result-pill,
.filter-header-reset {
  display: inline-flex;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid rgb(205 214 244 / 10%);
  border-radius: 999px;
  padding: 0 0.9rem;
  color: var(--ctp-subtext1);
  background: rgb(17 17 27 / 48%);
  font-size: 0.72rem;
  font-weight: 650;
}

.filter-result-pill strong {
  color: var(--ctp-text);
  font-weight: 850;
}

.filter-result-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: var(--ctp-green);
  box-shadow: 0 0 0 4px rgb(166 227 161 / 9%);
}

.filter-header-reset {
  border-color: rgb(245 194 231 / 15%);
  color: var(--ctp-pink);
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.filter-header-reset:hover {
  border-color: rgb(245 194 231 / 36%);
  background: rgb(245 194 231 / 8%);
  transform: translateY(-1px);
}

.filter-body {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
}

.filter-search-section,
.filter-group {
  position: relative;
  overflow: hidden;
  border: 1px solid rgb(205 214 244 / 8%);
  border-radius: 1.25rem;
  background: linear-gradient(145deg, rgb(49 50 68 / 42%), rgb(24 24 37 / 54%));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 2%);
}

.filter-search-section {
  padding: 1rem;
}

.filter-section-heading,
.filter-group-heading {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.filter-section-heading {
  justify-content: space-between;
  margin-bottom: 0.8rem;
}

.filter-step-badge {
  display: grid;
  width: 1.85rem;
  height: 1.85rem;
  flex: none;
  place-items: center;
  border: 1px solid rgb(205 214 244 / 8%);
  border-radius: 0.65rem;
  color: var(--ctp-overlay1);
  background: rgb(17 17 27 / 36%);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.filter-search-control {
  display: flex;
  height: 3.65rem;
  align-items: center;
  gap: 0.8rem;
  border: 1px solid rgb(205 214 244 / 11%);
  border-radius: 1rem;
  padding: 0 0.9rem;
  background: rgb(17 17 27 / 58%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 2%),
    0 12px 28px rgb(17 17 27 / 12%);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.filter-search-control:hover {
  border-color: rgb(245 194 231 / 25%);
}

.filter-search-control:focus-within,
.filter-search-control--active {
  border-color: rgb(245 194 231 / 48%);
  background: rgb(17 17 27 / 74%);
  box-shadow:
    0 0 0 3px rgb(245 194 231 / 8%),
    0 14px 34px rgb(17 17 27 / 18%);
}

.filter-search-icon {
  flex: none;
  color: var(--ctp-pink);
  font-size: 1.45rem;
}

.filter-search-input {
  min-width: 0;
  flex: 1;
  appearance: none;
  border: 0;
  outline: 0;
  padding: 0;
  color: var(--ctp-text);
  background: transparent;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 650;
}

.filter-search-input::placeholder {
  color: var(--ctp-overlay0);
}

.filter-search-input::-webkit-search-cancel-button {
  display: none;
}

.filter-enter-hint {
  display: inline-flex;
  height: 1.7rem;
  flex: none;
  align-items: center;
  border: 1px solid rgb(205 214 244 / 9%);
  border-bottom-color: rgb(205 214 244 / 16%);
  border-radius: 0.45rem;
  padding: 0 0.55rem;
  color: var(--ctp-overlay1);
  background: var(--ctp-surface0);
  box-shadow: 0 2px 0 var(--ctp-crust);
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 750;
}

.filter-search-clear {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: none;
  place-items: center;
  border: 0;
  border-radius: 0.65rem;
  padding: 0;
  color: var(--ctp-overlay2);
  background: transparent;
  transition:
    color 180ms ease,
    background-color 180ms ease;
}

.filter-search-clear:hover {
  color: var(--ctp-pink);
  background: rgb(245 194 231 / 8%);
}

.filter-active-row {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  border: 1px solid rgb(166 227 161 / 11%);
  border-radius: 1rem;
  padding: 0.75rem;
  background: rgb(166 227 161 / 3%);
}

.filter-active-label {
  display: inline-flex;
  height: 1.95rem;
  flex: none;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.25rem;
  color: var(--ctp-green);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.filter-chip {
  display: inline-flex;
  min-width: 0;
  height: 1.95rem;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgb(245 194 231 / 18%);
  border-radius: 999px;
  padding: 0 0.7rem;
  color: var(--ctp-pink);
  background: rgb(245 194 231 / 7%);
  font-size: 0.68rem;
  font-weight: 700;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.filter-chip:hover {
  border-color: rgb(245 194 231 / 40%);
  background: rgb(245 194 231 / 12%);
  transform: translateY(-1px);
}

.filter-groups {
  display: grid;
  gap: 1rem;
}

.filter-group {
  min-width: 0;
  padding: 1rem;
}

.filter-group::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  content: '';
}

.filter-group--catalog::before {
  background: linear-gradient(to bottom, var(--ctp-pink), rgb(245 194 231 / 12%));
}

.filter-group--release::before {
  background: linear-gradient(to bottom, var(--ctp-mauve), rgb(203 166 247 / 12%));
}

.filter-group-heading {
  margin-bottom: 1rem;
}

.filter-group-heading > div:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.filter-group-heading h2 {
  margin: 0;
  color: var(--ctp-rosewater);
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.filter-group-heading p {
  margin: 0.2rem 0 0;
  color: var(--ctp-overlay2);
  font-size: 0.68rem;
  font-weight: 500;
  line-height: 1.45;
}

.filter-group-icon {
  display: grid;
  width: 2.4rem;
  height: 2.4rem;
  flex: none;
  place-items: center;
  border: 1px solid rgb(205 214 244 / 8%);
  border-radius: 0.8rem;
  background: rgb(17 17 27 / 36%);
}

.filter-group--catalog .filter-group-icon {
  color: var(--ctp-pink);
}

.filter-group--release .filter-group-icon {
  color: var(--ctp-mauve);
}

.filter-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.filter-field {
  display: block;
  min-width: 0;
}

.filter-label {
  display: flex;
  min-height: 1.35rem;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
  color: var(--ctp-subtext1);
  font-size: 0.68rem;
  font-weight: 700;
}

.filter-label > div {
  color: var(--ctp-overlay2);
}

.filter-select {
  width: 100%;
  height: 3rem;
  min-width: 0;
  appearance: none;
  border: 1px solid rgb(205 214 244 / 10%);
  border-radius: 0.8rem;
  outline: none;
  padding: 0 2.5rem 0 0.85rem;
  color: var(--ctp-text);
  background-color: rgb(17 17 27 / 55%);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a6adc8' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 10 5 5 5-5'/%3E%3C/svg%3E");
  background-position: right 0.8rem center;
  background-repeat: no-repeat;
  background-size: 1rem;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 2%);
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 650;
  color-scheme: dark;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.filter-select:hover:not(:disabled) {
  border-color: rgb(245 194 231 / 28%);
  background-color: rgb(17 17 27 / 72%);
}

.filter-select:focus {
  border-color: rgb(245 194 231 / 52%);
  background-color: rgb(17 17 27 / 80%);
  box-shadow: 0 0 0 3px rgb(245 194 231 / 9%);
}

.filter-select option {
  color: var(--ctp-text);
  background: var(--ctp-mantle);
}

.filter-select:disabled {
  cursor: not-allowed;
  color: var(--ctp-overlay0);
  background-color: rgb(17 17 27 / 30%);
  opacity: 0.72;
}

.filter-field--disabled .filter-label {
  color: var(--ctp-overlay1);
}

.filter-toolbar {
  display: grid;
  align-items: end;
  gap: 1rem;
  border: 1px solid rgb(205 214 244 / 8%);
  border-radius: 1.25rem;
  padding: 1rem;
  background: rgb(17 17 27 / 28%);
}

.filter-sort-field {
  width: 100%;
}

.filter-status-copy {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.7rem;
}

.filter-status-icon {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  place-items: center;
  border: 1px solid rgb(137 220 235 / 13%);
  border-radius: 0.75rem;
  color: var(--ctp-sky);
  background: rgb(137 220 235 / 6%);
  font-size: 1.1rem;
}

.filter-status-icon--active {
  border-color: rgb(166 227 161 / 15%);
  color: var(--ctp-green);
  background: rgb(166 227 161 / 6%);
}

.filter-status-copy p {
  display: grid;
  min-width: 0;
  gap: 0.08rem;
  margin: 0;
}

.filter-status-copy strong {
  overflow: hidden;
  color: var(--ctp-subtext1);
  font-size: 0.7rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-status-copy span {
  overflow: hidden;
  color: var(--ctp-overlay1);
  font-size: 0.62rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-action-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
}

.filter-clear-button,
.filter-apply-button {
  display: inline-flex;
  height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.85rem;
  outline: none;
  padding: 0 1rem;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 800;
  white-space: nowrap;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.filter-clear-button {
  border: 1px solid rgb(205 214 244 / 10%);
  color: var(--ctp-subtext1);
  background: var(--ctp-surface0);
}

.filter-clear-button:hover {
  border-color: rgb(245 194 231 / 25%);
  color: var(--ctp-pink);
  background: var(--ctp-surface1);
  transform: translateY(-1px);
}

.filter-apply-button {
  min-width: 10.5rem;
  border: 1px solid rgb(255 255 255 / 16%);
  color: var(--ctp-crust);
  background: linear-gradient(135deg, var(--ctp-pink), var(--ctp-mauve));
  box-shadow:
    0 12px 28px rgb(203 166 247 / 16%),
    inset 0 1px 0 rgb(255 255 255 / 30%);
}

.filter-apply-button:hover {
  box-shadow:
    0 16px 34px rgb(203 166 247 / 24%),
    inset 0 1px 0 rgb(255 255 255 / 35%);
  transform: translateY(-2px);
}

.filter-header-reset:focus-visible,
.filter-search-clear:focus-visible,
.filter-chip:focus-visible,
.filter-clear-button:focus-visible,
.filter-apply-button:focus-visible {
  outline: 2px solid var(--ctp-pink);
  outline-offset: 2px;
}

@media (min-width: 720px) {
  .filter-body {
    gap: 1.1rem;
    padding: 1.5rem;
  }

  .filter-search-section,
  .filter-group,
  .filter-toolbar {
    padding: 1.15rem;
  }

  .filter-toolbar {
    grid-template-columns: minmax(11rem, 0.72fr) minmax(12rem, 1fr) auto;
  }
}

@media (min-width: 1024px) {
  .filter-groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 719px) {
  .filter-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 1.2rem;
  }

  .filter-header > div:last-child {
    width: 100%;
  }

  .filter-result-pill {
    flex: 1;
  }

  .filter-enter-hint {
    display: none;
  }

  .filter-action-buttons {
    width: 100%;
  }

  .filter-clear-button {
    flex: 1;
  }

  .filter-apply-button {
    flex: 2;
    min-width: 0;
  }
}

@media (max-width: 479px) {
  .filter-panel {
    border-radius: 1.35rem;
  }

  .filter-body {
    padding: 0.8rem;
  }

  .filter-title-icon {
    width: 2.8rem;
    height: 2.8rem;
    border-radius: 0.85rem;
  }

  .filter-subtitle {
    display: none;
  }

  .filter-search-section,
  .filter-group,
  .filter-toolbar {
    border-radius: 1rem;
    padding: 0.85rem;
  }

  .filter-search-control {
    height: 3.25rem;
  }

  .filter-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .filter-active-row {
    align-items: stretch;
    flex-direction: column;
    gap: 0.35rem;
  }

  .filter-action-buttons {
    align-items: stretch;
    flex-direction: column-reverse;
  }

  .filter-clear-button,
  .filter-apply-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .filter-header-reset,
  .filter-search-control,
  .filter-search-clear,
  .filter-chip,
  .filter-select,
  .filter-clear-button,
  .filter-apply-button {
    transition: none;
  }
}
</style>
