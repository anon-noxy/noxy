<script setup lang="ts">
type GenreAnime = {
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

type GenreResponse = {
  genre: string
  pageInfo?: {
    currentPage?: number
    hasNextPage?: boolean
  }
  results: GenreAnime[]
}

const route = useRoute()
const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))
const hasMounted = useMounted()

const genre = computed(() => decodeURIComponent(String(route.params.genre || '')))
const currentPage = computed(() => {
  const value = Number(route.query.page || 1)

  return Number.isInteger(value) && value > 0 ? value : 1
})

const { data, pending, error } = await useFetch<GenreResponse>(
  () => `/api/myanimelist/genre/${encodeURIComponent(genre.value)}?page=${currentPage.value}`,
  {
    key: () => `genre-${genre.value}-${currentPage.value}`,
    server: false,
  },
)

const animeResults = computed(() => data.value?.results || [])
const normalizeGenre = (value: string) => value.trim().toLowerCase()
const getMatchingGenres = (anime: GenreAnime) => {
  const currentGenre = normalizeGenre(genre.value)

  return (anime.genres || []).filter((item) => normalizeGenre(item) === currentGenre)
}
const hasNextPage = computed(() => Boolean(data.value?.pageInfo?.hasNextPage))
const previousPageTo = computed(() => {
  if (currentPage.value <= 1) {
    return ''
  }

  const query = currentPage.value - 1 > 1 ? `?page=${currentPage.value - 1}` : ''

  return `/genre/${encodeURIComponent(genre.value)}${query}`
})
const nextPageTo = computed(() => {
  if (!hasNextPage.value) {
    return ''
  }

  return `/genre/${encodeURIComponent(genre.value)}?page=${currentPage.value + 1}`
})

useSeoMeta({
  title: () => `${genre.value} Anime - Noxy`,
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
          <h1 class="text-3xl font-extrabold text-[var(--color-heading)]">{{ genre }} Anime</h1>
          <p class="mt-2 text-sm text-[var(--color-text)]/70">Results from MyAnimeList · Page {{ currentPage }}</p>
        </div>
      </div>

      <NAnimeGridSkeleton v-if="!hasMounted || pending" />

      <div v-else-if="error" class="mt-8 rounded bg-[var(--color-background-soft)] p-6 text-red-300">
        {{ error.statusMessage || 'Unable to load genre results.' }}
      </div>

      <div v-else-if="animeResults.length" class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <NAnimeHoverCard v-for="anime in animeResults" :key="anime.id" :anime-id="anime.id">
          <NuxtLink :to="`/anime/${anime.id}`" class="group block min-w-0 text-[var(--color-text)] no-underline">
            <NRemoteImage
              :src="anime.image"
              :alt="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
              class="aspect-[2/3] w-full rounded object-cover"
              loading="lazy"
            />

            <NTitleTransition
              as="h2"
              :text="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
              :transition-key="`${selectedLanguage}-${anime.id}`"
              class="genre-anime-title mt-3 block h-5 max-w-full text-sm font-bold leading-5 text-white transition group-hover:text-pink-300"
              :title="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
            />

            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text)]/70">
              <span>{{ anime.type }}</span>
              <span v-if="anime.year" class="text-[var(--color-text)]/40">•</span>
              <span v-if="anime.year">{{ anime.year }}</span>
              <span v-if="anime.score" class="text-[var(--color-text)]/40">•</span>
              <span v-if="anime.score">{{ anime.score }}%</span>
            </div>

            <div v-if="getMatchingGenres(anime).length" class="mt-3 flex flex-wrap gap-1.5">
              <span
                v-for="item in getMatchingGenres(anime)"
                :key="item"
                class="rounded bg-pink-300/15 px-2 py-0.5 text-[11px] font-semibold text-pink-300"
              >
                {{ item }}
              </span>
            </div>
          </NuxtLink>
        </NAnimeHoverCard>
      </div>

      <NEmptyResults
        v-else
        title="No anime found for this genre"
        message="This genre may be too narrow right now. Try the filter page or jump into the popular catalog."
      >
        <template #actions>
          <NuxtLink
            to="/filter"
            class="inline-flex items-center justify-center gap-2 rounded bg-pink-300 px-5 py-3 text-sm font-bold text-black no-underline transition hover:opacity-85"
          >
            <div i-material-symbols-tune-rounded class="text-lg" />
            <span>Open filters</span>
          </NuxtLink>

          <NuxtLink
            to="/category/most-popular"
            class="inline-flex items-center justify-center gap-2 rounded bg-[var(--color-background-mute)] px-5 py-3 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:text-pink-300"
          >
            <div i-material-symbols-trending-up-rounded class="text-lg" />
            <span>Most Popular</span>
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

<style scoped>
.genre-anime-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
