<script setup lang="ts">
type SearchResult = {
  id: number
  title: string
  romajiTitle: string
  type: string
  episodes: number
  year: number | string
  image: string
}

type Props = {
  id?: string
  placeholder?: string
  label?: string
}

withDefaults(defineProps<Props>(), {
  id: 'site-search',
  placeholder: 'Search...',
  label: 'Search',
})

const model = defineModel<string>({ default: '' })
const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))

const searchRoot = ref<HTMLElement | null>(null)
const results = ref<SearchResult[]>([])
const isFocused = ref(false)
const isSearching = ref(false)
const searchError = ref('')
const debouncedModel = refDebounced(model, 300)

const showResults = computed(() => {
  return isFocused.value && model.value.trim().length >= 2
})

const clearSearch = () => {
  model.value = ''
  results.value = []
  searchError.value = ''
}

const closeResults = () => {
  isFocused.value = false
}

const searchAnime = async (query: string) => {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 2) {
    results.value = []
    searchError.value = ''
    isSearching.value = false
    return
  }

  isSearching.value = true
  searchError.value = ''

  try {
    results.value = await $fetch<SearchResult[]>('/api/myanimelist/search', {
      query: {
        q: trimmedQuery,
      },
    })
  } catch (error) {
    console.error('Search error:', error)
    results.value = []
    searchError.value = 'Unable to load search results.'
  } finally {
    isSearching.value = false
  }
}

watch(model, (value) => {
  if (value.trim().length < 2) {
    results.value = []
    searchError.value = ''
    isSearching.value = false
  }
})

watch(debouncedModel, (value) => {
  if (value.trim().length >= 2) {
    void searchAnime(value)
  }
})

onClickOutside(searchRoot, closeResults)
</script>

<template>
  <div ref="searchRoot" class="relative w-full">
    <label :for="id" class="sr-only">{{ label }}</label>

    <div
      class="flex h-11 w-full items-center gap-3 bg-[var(--color-background-soft)] px-4 text-[var(--color-text)] transition"
    >
      <div i-material-symbols-search-rounded class="shrink-0 text-lg text-[var(--color-text)]/70" />

      <input
        :id="id"
        v-model="model"
        type="search"
        :placeholder="placeholder"
        class="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-sm font-medium text-[var(--color-text)] shadow-none outline-none ring-0 placeholder:text-[var(--color-text)]/50 focus:border-0 focus:outline-none focus:ring-0"
        autocomplete="off"
        spellcheck="false"
        @focus="isFocused = true"
      />

      <button
        v-if="model"
        type="button"
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border-0 bg-transparent p-0 text-[var(--color-text)]/70 transition hover:bg-white/10 hover:text-pink-300"
        aria-label="Clear search"
        @click="clearSearch"
      >
        <div i-material-symbols-close-rounded class="text-lg" />
      </button>
    </div>

    <div
      v-if="showResults"
      class="absolute left-0 right-0 top-full z-[110] mt-2 overflow-hidden rounded border border-dark-300 bg-[var(--color-background)] shadow-xl"
    >
      <div v-if="isSearching" class="flex items-center justify-center p-4 text-pink-300">
        <div class="text-3xl" i-eos-icons:three-dots-loading />
      </div>

      <div v-else-if="searchError" class="p-4 text-sm text-red-300">
        {{ searchError }}
      </div>

      <div v-else-if="results.length === 0" class="p-4 text-sm text-[var(--color-text)]/60">No results found.</div>

      <template v-else>
        <NAnimeHoverCard v-for="anime in results" :key="anime.id" :anime-id="anime.id">
          <NuxtLink
            :to="`/anime/${anime.id}`"
            class="flex gap-3 border-b border-dark-300 p-3 text-[var(--color-text)] no-underline transition last:border-b-0 hover:bg-[var(--color-background-soft)]"
            @click="closeResults"
          >
            <NRemoteImage
              v-if="anime.image"
              :src="anime.image"
              :alt="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
              class="h-16 w-12 shrink-0 rounded object-cover"
              loading="lazy"
            />

            <div class="min-w-0 flex-1">
              <NTitleTransition
                as="h2"
                :text="selectedLanguage === 'EN' ? anime.title : anime.romajiTitle"
                :transition-key="`${selectedLanguage}-${anime.id}`"
                class="truncate text-sm font-bold text-white"
              />

              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text)]/65">
                <span>{{ anime.type }}</span>
                <span v-if="anime.year" class="text-[var(--color-text)]/35">•</span>
                <span v-if="anime.year">{{ anime.year }}</span>
                <span v-if="anime.episodes" class="text-[var(--color-text)]/35">•</span>
                <span v-if="anime.episodes">{{ anime.episodes }} eps</span>
              </div>
            </div>
          </NuxtLink>
        </NAnimeHoverCard>
      </template>
    </div>
  </div>
</template>
