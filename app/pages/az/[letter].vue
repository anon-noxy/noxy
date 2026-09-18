<script setup lang="ts">
type AzAnime = {
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
  matchedTitle?: string
  sortTitle?: string
  matchSource?: string
}

type AzResponse = {
  letter: string
  pageInfo?: {
    total?: number
    currentPage?: number
    hasNextPage?: boolean
  }
  results: AzAnime[]
}

const route = useRoute()
const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))
const hasMounted = useMounted()

const letter = computed(() => String(route.params.letter || 'all').toLowerCase())
const currentPage = computed(() => {
  const value = Number(route.query.page || 1)

  return Number.isInteger(value) && value > 0 ? value : 1
})
const title = computed(() => {
  if (letter.value === 'all') return 'A-Z Anime'
  if (letter.value === 'number') return '0-9 Anime'
  if (letter.value === 'symbol') return '# Anime'

  return `${letter.value.toUpperCase()} Anime`
})

const { data, pending, error } = await useFetch<AzResponse>(
  () => `/api/myanimelist/az?letter=${encodeURIComponent(letter.value)}&page=${currentPage.value}`,
  {
    key: () => `az-${letter.value}-${currentPage.value}`,
    default: () => ({
      letter: 'all',
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

const animeResults = computed(() => data.value?.results || [])
const totalResults = computed(() => data.value?.pageInfo?.total || 0)
const hasNextPage = computed(() => Boolean(data.value?.pageInfo?.hasNextPage))
const isAlphabetLetterPage = computed(() => /^[a-z]$/.test(letter.value))
const isGroupedAzPage = computed(
  () => isAlphabetLetterPage.value || letter.value === 'number' || letter.value === 'symbol',
)
const matchLabel = computed(() => {
  if (letter.value === 'number') return '0-9'
  if (letter.value === 'symbol') return '#'

  return letter.value.toUpperCase()
})
const previousPageTo = computed(() => {
  if (currentPage.value <= 1) return ''

  const query = currentPage.value - 1 > 1 ? `?page=${currentPage.value - 1}` : ''

  return `/az/${encodeURIComponent(letter.value)}${query}`
})
const nextPageTo = computed(() => {
  if (!hasNextPage.value) return ''

  return `/az/${encodeURIComponent(letter.value)}?page=${currentPage.value + 1}`
})

const getAnimeDisplayTitle = (anime: AzAnime) => {
  return selectedLanguage.value === 'EN' ? anime.title : anime.romajiTitle
}

const toComparableTitle = (title: string) =>
  title
    .replace(/^(?:the|an|a)\s+/i, '')
    .trim()
    .toLowerCase()

const getMatchedSortTitle = (anime: AzAnime) => {
  if (!isGroupedAzPage.value) return ''

  const displayTitle = getAnimeDisplayTitle(anime)
  const sortTitle = anime.sortTitle?.trim() || anime.matchedTitle?.trim() || ''

  if (letter.value === 'number' || letter.value === 'symbol') {
    return sortTitle
  }

  if (!sortTitle || toComparableTitle(displayTitle) === toComparableTitle(sortTitle)) {
    return ''
  }

  return sortTitle
}

const getHighlightedTitleParts = (anime: AzAnime) => {
  const title = getAnimeDisplayTitle(anime)

  if (!isAlphabetLetterPage.value) {
    return [{ text: title, match: false }]
  }

  const targetTitle = anime.sortTitle || anime.matchedTitle || ''
  const targetIndex = targetTitle ? title.toLowerCase().indexOf(targetTitle.toLowerCase()) : -1
  const matchIndex =
    targetIndex >= 0
      ? targetIndex
      : title
          .toLowerCase()
          .split('')
          .findIndex((character) => character === letter.value)

  if (matchIndex < 0) {
    return [{ text: title, match: false }]
  }

  return [
    { text: title.slice(0, matchIndex), match: false },
    { text: title.slice(matchIndex, matchIndex + 1), match: true },
    { text: title.slice(matchIndex + 1), match: false },
  ].filter((part) => part.text)
}

useSeoMeta({
  title: () => `${title.value} - Noxy`,
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)] px-4 py-20 text-[var(--color-text)] sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <NuxtLink to="/home" class="text-sm font-semibold text-pink-300 no-underline transition hover:text-pink-200">
        Back home
      </NuxtLink>

      <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-extrabold text-[var(--color-heading)]">
            {{ title }}
          </h1>
          <p class="mt-2 text-sm text-[var(--color-text)]/70">
            Alphabetized anime results from MyAnimeList · Page {{ currentPage }}
          </p>
        </div>
        <p class="text-sm text-[var(--color-heading)]">{{ totalResults.toLocaleString() }} results</p>
      </div>

      <NAnimeGridSkeleton v-if="!hasMounted || pending" />

      <div v-else-if="error" class="mt-8 rounded bg-[var(--color-background-soft)] p-6 text-red-300">
        {{ error.statusMessage || 'Unable to load A-Z results.' }}
      </div>

      <NVirtualAnimeGrid
        v-else-if="animeResults.length"
        :items="animeResults"
        class="mt-8"
        :min-column-width="140"
        :max-columns="6"
        :estimated-item-height="380"
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
                :alt="getAnimeDisplayTitle(anime)"
                class="aspect-[2/3] w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />

              <span
                v-if="getMatchedSortTitle(anime)"
                class="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-[#3a273d]/95 px-2 py-1 text-[10px] font-black text-pink-100 shadow-lg shadow-black/30 ring-1 ring-pink-300/25 backdrop-blur-sm"
              >
                <span class="text-pink-300">{{ matchLabel }}</span>
                <span>match</span>
              </span>

              <div
                v-if="getMatchedSortTitle(anime)"
                class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-2 pb-2 pt-10"
              >
                <span
                  class="flex max-w-full items-center gap-1.5 rounded bg-[#3a273d]/95 px-2 py-1 text-[10px] font-bold text-pink-100 shadow-lg shadow-black/30 ring-1 ring-pink-300/25 backdrop-blur-sm"
                >
                  <span class="shrink-0 text-pink-300">Sorted as</span>
                  <span class="min-w-0 truncate text-white">{{ getMatchedSortTitle(anime) }}</span>
                </span>
              </div>
            </div>

            <NTitleTransition
              as="h2"
              :transition-key="`${selectedLanguage}-${anime.id}`"
              class="mt-3 block h-5 truncate text-sm font-bold leading-5 text-white transition group-hover:text-pink-300"
            >
              <span
                v-for="(part, partIndex) in getHighlightedTitleParts(anime)"
                :key="`${part.text}-${partIndex}`"
                :class="part.match ? 'text-pink-300' : ''"
              >
                {{ part.text }}
              </span>
            </NTitleTransition>

            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text)]/70">
              <span>{{ anime.type }}</span>
              <span v-if="anime.year" class="text-[var(--color-text)]/40">•</span>
              <span v-if="anime.year">{{ anime.year }}</span>
              <span v-if="anime.score" class="text-[var(--color-text)]/40">•</span>
              <span v-if="anime.score">{{ anime.score }}%</span>
            </div>

            <div v-if="anime.genres.length" class="mt-3 flex flex-wrap gap-1.5">
              <span
                v-for="genre in anime.genres.slice(0, 2)"
                :key="genre"
                class="rounded bg-pink-300/15 px-2 py-0.5 text-[11px] font-semibold text-pink-300"
              >
                {{ genre }}
              </span>
            </div>
            </NuxtLink>
          </NAnimeHoverCard>
        </template>
      </NVirtualAnimeGrid>

      <NEmptyResults
        v-else
        title="No titles found"
        message="There are no anime results for this A-Z page yet. Try all titles or search with filters."
      >
        <template #actions>
          <NuxtLink
            to="/az/all"
            class="inline-flex items-center justify-center gap-2 rounded bg-pink-300 px-5 py-3 text-sm font-bold text-black no-underline transition hover:opacity-85"
          >
            <div i-material-symbols-sort-by-alpha-rounded class="text-lg" />
            <span>All titles</span>
          </NuxtLink>

          <NuxtLink
            to="/filter"
            class="inline-flex items-center justify-center gap-2 rounded bg-[var(--color-background-mute)] px-5 py-3 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:text-pink-300"
          >
            <div i-material-symbols-search-rounded class="text-lg" />
            <span>Search anime</span>
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
    </div>
  </main>
</template>
