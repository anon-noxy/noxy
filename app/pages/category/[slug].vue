<script setup lang="ts">
type CatalogAnime = {
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
}

type CatalogResponse = {
  slug: string
  title: string
  description: string
  pageInfo?: {
    currentPage?: number
    hasNextPage?: boolean
  }
  results: CatalogAnime[]
}

const route = useRoute()
const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))
const hasMounted = useMounted()
const catalogCacheVersion = 'v8'

const slug = computed(() => String(route.params.slug || 'you-may-also-watch'))
const currentPage = computed(() => {
  const value = Number(route.query.page || 1)

  return Number.isInteger(value) && value > 0 ? value : 1
})

const { data, pending, error } = await useFetch<CatalogResponse>(
  () =>
    `/api/myanimelist/catalog?category=${encodeURIComponent(slug.value)}&page=${currentPage.value}&v=${catalogCacheVersion}`,
  {
    key: () => `catalog-${catalogCacheVersion}-${slug.value}-${currentPage.value}`,
    server: false,
  },
)

const animeResults = computed(() => data.value?.results || [])
const pageTitle = computed(() => data.value?.title || 'Anime')
const pageDescription = computed(() => data.value?.description || 'Anime results from MyAnimeList.')
const hasNextPage = computed(() => Boolean(data.value?.pageInfo?.hasNextPage))
const previousPageTo = computed(() => {
  if (currentPage.value <= 1) return ''

  const query = currentPage.value - 1 > 1 ? `?page=${currentPage.value - 1}` : ''

  return `/category/${encodeURIComponent(slug.value)}${query}`
})
const nextPageTo = computed(() => {
  if (!hasNextPage.value) return ''

  return `/category/${encodeURIComponent(slug.value)}?page=${currentPage.value + 1}`
})

useSeoMeta({
  title: () => `${pageTitle.value} - Noxy`,
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)] px-4 py-20 text-[var(--color-text)] sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <NuxtLink to="/home" class="text-sm font-semibold text-pink-300 no-underline transition hover:text-pink-200">
        Back home
      </NuxtLink>

      <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <h1 class="truncate text-3xl font-extrabold text-[var(--color-heading)]" :title="pageTitle">
            {{ pageTitle }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm text-[var(--color-text)]/70">
            {{ pageDescription }} · Page {{ currentPage }}
          </p>
        </div>
      </div>

      <NAnimeGridSkeleton v-if="!hasMounted || pending" />

      <div v-else-if="error" class="mt-8 rounded bg-[var(--color-background-soft)] p-6 text-red-300">
        {{ error.statusMessage || 'Unable to load anime results.' }}
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
              class="mt-3 block h-5 truncate text-sm font-bold leading-5 text-white transition group-hover:text-pink-300"
              :title="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
            />

            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text)]/70">
              <span>{{ anime.type }}</span>
              <span v-if="anime.year || anime.date" class="text-[var(--color-text)]/40">•</span>
              <span v-if="anime.year || anime.date">{{ anime.year || anime.date }}</span>
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
      </div>

      <NEmptyResults
        v-else
        title="Nothing showed up here"
        message="This category does not have results right now. Try a popular list or browse the full catalog instead."
      >
        <template #actions>
          <NuxtLink
            to="/category/most-popular"
            class="inline-flex items-center justify-center gap-2 rounded bg-pink-300 px-5 py-3 text-sm font-bold text-black no-underline transition hover:opacity-85"
          >
            <div i-material-symbols-trending-up-rounded class="text-lg" />
            <span>Most Popular</span>
          </NuxtLink>

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
    </div>
  </main>
</template>
