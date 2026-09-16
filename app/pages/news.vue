<script setup lang="ts">
type AnimeNewsArticle = {
  title: string
  slug: string
  source: string
  excerpt?: string
  date?: string
  image?: string
  link?: string
  tags?: string[]
}

type AnimeNewsMeta = {
  total?: number
  returned?: number
  hasMore?: boolean
  source?: string
  sort?: string
  query?: string
  availableSources?: string[]
  responseTime?: string
  timestamp?: string
}

type AnimeNewsResponse = {
  success: boolean
  data?: AnimeNewsArticle[]
  meta?: AnimeNewsMeta
  message?: string
}

const sourceOptions = [
  { value: 'all', label: 'All' },
  { value: 'myanimelist', label: 'MAL' },
  { value: 'crunchyroll', label: 'Crunchyroll' },
  { value: 'ann', label: 'ANN' },
  { value: 'animecorner', label: 'Anime Corner' },
  { value: 'otakuusa', label: 'Otaku USA' },
  { value: 'animeherald', label: 'Anime Herald' },
  { value: 'comicbook', label: 'ComicBook' },
]

const searchQuery = ref('')
const activeQuery = ref('')
const activeSource = ref('all')

const {
  data: newsResponse,
  pending,
  refresh,
} = await useFetch<AnimeNewsResponse>('/api/news', {
  default: () => ({
    success: true,
    data: [],
    meta: {
      total: 0,
    },
  }),
  key: () => `anime-news-${activeSource.value}-${activeQuery.value || 'latest'}`,
  query: {
    q: activeQuery,
    source: activeSource,
    limit: 24,
    sort: 'latest',
  },
  lazy: true,
})

const articles = computed(() => {
  return [...(newsResponse.value?.data || [])].sort((left, right) => {
    const leftDate = new Date(left.date || 0).getTime()
    const rightDate = new Date(right.date || 0).getTime()

    return rightDate - leftDate
  })
})

const formatArticleDate = (value?: string) => {
  if (!value) return 'Recently'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const selectSource = async (source: string) => {
  activeSource.value = source
  await refresh()
}

const submitSearch = async () => {
  activeQuery.value = searchQuery.value.trim()
  await refresh()
}

const clearSearch = async () => {
  searchQuery.value = ''
  activeQuery.value = ''
  await refresh()
}

const resetNewsFilters = async () => {
  searchQuery.value = ''
  activeQuery.value = ''
  activeSource.value = 'all'
  await refresh()
}

useSeoMeta({
  title: 'Anime News - Noxy',
  description: 'Latest anime news from MyAnimeList, Crunchyroll, Anime News Network, and more.',
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)] px-4 py-20 text-[var(--color-text)] sm:px-6 lg:px-8">
    <section class="mx-auto max-w-7xl">
      <NuxtLink to="/home" class="text-sm font-semibold text-pink-300 no-underline transition hover:text-pink-200">
        Back home
      </NuxtLink>

      <div class="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="text-3xl font-extrabold text-[var(--color-heading)]">Anime News</h1>
          <p class="mt-2 max-w-2xl text-sm text-[var(--color-text)]/70">
            Latest anime headlines from multiple sources, sorted by newest first.
          </p>
        </div>

        <form class="flex w-full gap-2 lg:w-md" @submit.prevent="submitSearch">
          <div class="flex min-w-0 flex-1 items-center gap-2 rounded bg-[var(--color-background-soft)] px-3 py-2">
            <div i-material-symbols-search-rounded class="shrink-0 text-lg text-pink-300" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search news..."
              class="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-sm font-semibold text-[var(--color-text)] outline-none placeholder:text-[var(--color-text)]/45"
            />
          </div>
          <button type="submit" class="rounded border-0 bg-pink-300 px-4 py-2 text-sm font-bold text-black">
            Search
          </button>
          <button
            v-if="activeQuery"
            type="button"
            class="rounded border-0 bg-[var(--color-background-soft)] px-4 py-2 text-sm font-bold text-[var(--color-heading)] transition hover:text-pink-300"
            @click="clearSearch"
          >
            Clear
          </button>
        </form>
      </div>

      <div class="mt-6 flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="source in sourceOptions"
          :key="source.value"
          type="button"
          class="shrink-0 rounded border-0 px-4 py-2 text-sm font-bold transition"
          :class="
            activeSource === source.value
              ? 'bg-pink-300 text-black'
              : 'bg-[var(--color-background-soft)] text-[var(--color-heading)] hover:text-pink-300'
          "
          @click="selectSource(source.value)"
        >
          {{ source.label }}
        </button>
      </div>

      <div v-if="activeQuery" class="mt-5 text-sm font-semibold text-[var(--color-text)]/65">
        Showing results for "{{ activeQuery }}"
      </div>

      <NNewsGridSkeleton v-if="pending" />

      <template v-else-if="articles.length">
        <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
          <NuxtLink
            v-for="article in articles"
            :key="article.slug"
            :to="article.link || '#'"
            external
            target="_blank"
            rel="noreferrer"
            class="group flex min-h-0 flex-col rounded bg-[var(--color-background-soft)] p-4 text-[var(--color-text)] no-underline transition hover:bg-[var(--color-background-mute)]"
          >
            <div class="flex flex-1 flex-col">
              <div class="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span class="text-pink-300">{{ article.source }}</span>
                <span class="text-[var(--color-text)]/45">{{ formatArticleDate(article.date) }}</span>
              </div>
              <h2 class="mt-3 line-clamp-2 font-extrabold leading-6 text-[var(--color-heading)]">
                {{ article.title }}
              </h2>
              <p v-if="article.excerpt" class="mt-2 line-clamp-2 text-sm leading-5 text-[var(--color-text)]/65">
                {{ article.excerpt }}
              </p>
              <div v-if="article.tags?.length" class="mt-auto flex flex-wrap gap-1.5 pt-3">
                <span
                  v-for="tag in article.tags.slice(0, 3)"
                  :key="tag"
                  class="rounded bg-pink-300/15 px-2 py-0.5 text-xs font-semibold text-pink-300"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </template>

      <NEmptyResults
        v-else
        title="No news matched that search"
        :message="
          newsResponse.message || 'Try clearing the search, changing the source, or going back to the latest headlines.'
        "
      >
        <template #actions>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded bg-pink-300 px-5 py-3 text-sm font-bold text-black transition hover:opacity-85"
            @click="resetNewsFilters"
          >
            <div i-material-symbols-restart-alt-rounded class="text-lg" />
            <span>Reset news</span>
          </button>

          <NuxtLink
            to="/home"
            class="inline-flex items-center justify-center gap-2 rounded bg-[var(--color-background-mute)] px-5 py-3 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:text-pink-300"
          >
            <div i-material-symbols-home-rounded class="text-lg" />
            <span>Go home</span>
          </NuxtLink>
        </template>
      </NEmptyResults>
    </section>
  </main>
</template>
