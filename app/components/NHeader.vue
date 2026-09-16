<script setup lang="ts">
import { supportedAnimeGenres } from '#shared/animeGenres'

type SearchItem = {
  id: number
  title: string
  image: string
  romajiTitle: string
  type: string
  episodes: number
  year: number | string
}

type SearchOption =
  | {
      key: string
      kind: 'result'
      label: string
      anime: SearchItem
    }
  | {
      key: string
      kind: 'recent' | 'trending' | 'filter'
      label: string
      query: string
    }

type NavItem = {
  label: string
  to?: string
  icon?: string
  action?: 'random'
}

const desktopNavItems: NavItem[] = [
  { label: 'Random', icon: 'i-fe-random', action: 'random' },
  { label: 'News', to: '/news', icon: 'i-material-symbols-rss-feed' },
  { label: 'Community', to: '/community', icon: 'i-material-symbols-groups-rounded' },
]

const firstDesktopNavItems = desktopNavItems.slice(0, 2)
const lastDesktopNavItems = desktopNavItems.slice(2)

const mobileNavItems: NavItem[] = [
  { label: 'Home', to: '/home' },
  { label: 'Watchlist', to: '/watchlist' },
  { label: 'You May Also Watch', to: '/category/you-may-also-watch' },
  { label: 'Latest Added', to: '/category/latest-added' },
  { label: 'Most Popular', to: '/category/most-popular' },
  { label: 'Top Upcoming', to: '/category/top-upcoming' },
  { label: 'Subbed Anime', to: '/category/subbed-anime' },
  { label: 'Dubbed Anime', to: '/category/dubbed-anime' },
  { label: 'Movie', to: '/category/movie' },
  { label: 'OVA', to: '/category/ova' },
  { label: 'Specials', to: '/category/specials' },
]

const menuGenreColors = ['#a6e3a1', '#f9e2af', '#f38ba8', '#f5c2e7', '#89dceb', '#b4befe', '#94e2d5', '#fab387']
const menuGenres = supportedAnimeGenres.map((label, index) => ({
  label,
  color: menuGenreColors[index % menuGenreColors.length] || '#a6e3a1',
}))
const menuGenrePreviewCount = 12

const isOpen = ref(false)
const isSearchOpen = ref(false)
const isRandomLoading = ref(false)
const areAllMenuGenresShown = ref(false)
const visibleMenuGenres = computed(() => {
  return areAllMenuGenresShown.value ? menuGenres : menuGenres.slice(0, menuGenrePreviewCount)
})
const hasMoreMenuGenres = menuGenres.length > menuGenrePreviewCount
const { y: windowScrollY } = useWindowScroll()
const isScrolled = computed(() => windowScrollY.value > 0)
const userPreferences = useUserPreferencesStore()
const { watchlistCount, recentSearches } = storeToRefs(userPreferences)
const { displayName, isAuthenticated, isReady, profile, signOut, user } = useSupabaseAuth()
const router = useRouter()
const route = useRoute()
const { openAuthModal } = useAuthModal()
const isAccountMenuOpen = ref(false)
const hasHydrated = ref(false)
const isBodyScrollLocked = useScrollLock(import.meta.client ? document.body : null)

const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))
const toggleLanguage = inject<(lang: string) => void>('toggleLanguage', (lang: string) => {
  selectedLanguage.value = lang
})

const searchQuery = ref('')
const desktopSearchInput = ref<HTMLInputElement | null>(null)
const mobileSearchInput = ref<HTMLInputElement | null>(null)
const debouncedSearchQuery = refDebounced(searchQuery, 300)
const searchResults = ref<SearchItem[]>([])
const trendingSearches = ref<SearchItem[]>([])
const isSearching = ref(false)
const searchError = ref('')
const showSearchResults = ref(false)
const activeSearchIndex = ref(-1)
const showAuthenticatedUi = computed(() => hasHydrated.value && isReady.value && isAuthenticated.value)
const visibleMobileNavItems = computed(() => {
  return showAuthenticatedUi.value ? mobileNavItems : mobileNavItems.filter((item) => item.to !== '/watchlist')
})
const accountInitial = computed(() => {
  return displayName.value.trim().charAt(0).toUpperCase() || 'A'
})
const accountAvatarUrl = computed(() => {
  return profile.value?.avatar_url || String(user.value?.user_metadata?.avatar_url || '')
})
const filterTo = computed(() => {
  const query = searchQuery.value.trim()

  return query ? `/filter?search=${encodeURIComponent(query)}` : '/filter'
})

const searchOptions = computed<SearchOption[]>(() => {
  const query = searchQuery.value.trim()

  if (query.length >= 2) {
    const resultOptions = searchResults.value.map((anime) => ({
      key: `result-${anime.id}`,
      kind: 'result' as const,
      label: selectedLanguage.value === 'EN' ? anime.title : anime.romajiTitle,
      anime,
    }))

    return [
      ...resultOptions,
      {
        key: `filter-${query}`,
        kind: 'filter',
        label: `Search all results for "${query}"`,
        query,
      },
    ]
  }

  return [
    ...recentSearches.value.map((query) => ({
      key: `recent-${query}`,
      kind: 'recent' as const,
      label: query,
      query,
    })),
    ...trendingSearches.value.slice(0, 5).map((anime) => ({
      key: `trending-${anime.id}`,
      kind: 'trending' as const,
      label: selectedLanguage.value === 'EN' ? anime.title : anime.romajiTitle,
      query: selectedLanguage.value === 'EN' ? anime.title : anime.romajiTitle,
    })),
  ]
})

const hasSearchPanelContent = computed(() => {
  return isSearching.value || Boolean(searchError.value) || searchOptions.value.length > 0
})

const drawer = () => {
  isOpen.value = !isOpen.value
}

const closeDrawer = () => {
  isOpen.value = false
}

const closeAccountMenu = () => {
  isAccountMenuOpen.value = false
}

const openAccountModal = () => {
  closeAccountMenu()
  openAuthModal('login', route.fullPath)
}

const closeSearchResults = () => {
  showSearchResults.value = false
  activeSearchIndex.value = -1
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  searchError.value = ''
  isSearching.value = false
  showSearchResults.value = false
}

const clearSearchInput = async (input?: HTMLInputElement | null) => {
  clearSearch()
  showSearchResults.value = true
  await nextTick()
  input?.focus()
}

const openSearchResults = () => {
  showSearchResults.value = true
}

const focusNavbarSearch = async () => {
  if (!import.meta.client) return

  if (window.matchMedia('(min-width: 1280px)').matches) {
    desktopSearchInput.value?.focus()
  } else {
    isSearchOpen.value = true
    await nextTick()
    mobileSearchInput.value?.focus()
  }

  openSearchResults()
}

const toggleMobileSearch = async () => {
  isSearchOpen.value = !isSearchOpen.value

  if (!isSearchOpen.value) {
    closeSearchResults()
    return
  }

  await nextTick()
  mobileSearchInput.value?.focus()
  openSearchResults()
}

const goToFilter = async () => {
  const query = searchQuery.value.trim()
  const to = filterTo.value

  if (query.length >= 2) {
    userPreferences.addRecentSearch(query)
  }

  clearSearch()
  isSearchOpen.value = false

  await router.push(to)
}

const goToSearchQuery = async (query: string, closeMobileSearch = false) => {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) return

  userPreferences.addRecentSearch(trimmedQuery)
  clearSearch()

  if (closeMobileSearch) {
    isSearchOpen.value = false
  }

  await router.push(`/filter?search=${encodeURIComponent(trimmedQuery)}`)
}

const goToSearchOption = async (option: SearchOption, closeMobileSearch = false) => {
  if (option.kind === 'result') {
    userPreferences.addRecentSearch(option.label)
    clearSearch()

    if (closeMobileSearch) {
      isSearchOpen.value = false
    }

    await router.push(`/anime/${option.anime.id}`)
    return
  }

  await goToSearchQuery(option.query, closeMobileSearch)
}

const moveSearchSelection = (direction: -1 | 1) => {
  if (!showSearchResults.value) {
    openSearchResults()
  }

  const count = searchOptions.value.length

  if (!count) return

  activeSearchIndex.value = (activeSearchIndex.value + direction + count) % count
}

const handleSearchKeydown = async (event: KeyboardEvent, closeMobileSearch = false) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveSearchSelection(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveSearchSelection(-1)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()

    const activeOption = searchOptions.value[activeSearchIndex.value]

    if (activeOption) {
      await goToSearchOption(activeOption, closeMobileSearch)
      return
    }

    await goToFilter()
  }
}

const goToRandomAnime = async () => {
  if (isRandomLoading.value) return

  isRandomLoading.value = true
  closeDrawer()
  closeSearchResults()

  try {
    const anime = await $fetch<{ id: number }>('/api/myanimelist/random')

    await router.push(`/anime/${anime.id}`)
  } catch (error) {
    console.error('Random anime error:', error)
  } finally {
    isRandomLoading.value = false
  }
}

const signOutAccount = async () => {
  try {
    await signOut()
    userPreferences.pushToast('Signed out', 'info')
    closeAccountMenu()
    closeDrawer()
    await router.push('/home')
  } catch (error) {
    console.error('Sign out error:', error)
    userPreferences.pushToast('Unable to sign out right now', 'error')
  }
}

const handleNavItemClick = async (item: NavItem, event: MouseEvent) => {
  if (item.action !== 'random') {
    closeDrawer()
    return
  }

  event.preventDefault()
  await goToRandomAnime()
}

const fetchSearchResults = async (query: string) => {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 2) {
    searchResults.value = []
    searchError.value = ''
    isSearching.value = false
    showSearchResults.value = false
    return
  }

  isSearching.value = true
  searchError.value = ''
  showSearchResults.value = true

  try {
    searchResults.value = await $fetch<SearchItem[]>('/api/myanimelist/search', {
      query: {
        q: trimmedQuery,
      },
    })
  } catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
    searchError.value = 'Unable to load search results'
  } finally {
    isSearching.value = false
  }
}

const fetchTrendingSearches = async () => {
  try {
    trendingSearches.value = await $fetch<SearchItem[]>('/api/myanimelist/trending')
  } catch (error) {
    console.error('Trending search error:', error)
    trendingSearches.value = []
  }
}

watch(searchQuery, (newValue) => {
  if (newValue.trim().length < 2) {
    searchResults.value = []
    searchError.value = ''
    activeSearchIndex.value = -1
  }
})

watch(debouncedSearchQuery, (newValue) => {
  if (newValue.trim().length >= 2) {
    void fetchSearchResults(newValue)
  }
})

watch(searchOptions, () => {
  activeSearchIndex.value = searchOptions.value.length
    ? Math.min(Math.max(activeSearchIndex.value, -1), searchOptions.value.length - 1)
    : -1
})

watch(isOpen, (drawerOpen) => {
  isBodyScrollLocked.value = drawerOpen
})

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeDrawer()
    closeAccountMenu()
    closeSearchResults()
    isSearchOpen.value = false
    return
  }

  const target = event.target as HTMLElement | null
  const isTyping = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'))
  const isSlashShortcut = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey
  const isCommandShortcut = event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)

  if (!isTyping && (isSlashShortcut || isCommandShortcut)) {
    event.preventDefault()
    void focusNavbarSearch()
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  if (!target.closest('.search-container')) {
    closeSearchResults()
  }

  if (!target.closest('.account-container')) {
    closeAccountMenu()
  }
}

useEventListener(import.meta.client ? document : null, 'keydown', handleKeydown)
useEventListener(import.meta.client ? document : null, 'click', handleClickOutside)

onMounted(() => {
  hasHydrated.value = true
  fetchTrendingSearches()
})

onBeforeUnmount(() => {
  isBodyScrollLocked.value = false
})
</script>

<template>
  <nav
    :class="[
      'fixed left-0 right-0 top-0 z-[100] px-3 py-2 transition-colors duration-300 sm:px-5',
      isScrolled
        ? 'border-b border-[var(--color-border)] bg-[var(--color-background)] backdrop-blur'
        : 'border-b border-transparent bg-transparent',
    ]"
  >
    <div class="flex min-h-12 items-center justify-between gap-3">
      <div class="flex min-w-0 flex-1 items-center gap-3 xl:gap-5">
        <button
          type="button"
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border-0 bg-transparent p-0 text-[var(--color-heading)] transition hover:bg-[var(--color-background-soft)]"
          :aria-expanded="isOpen"
          aria-controls="site-menu"
          aria-label="Open navigation menu"
          @click="drawer"
        >
          <div class="text-2xl" i-icon-park-outline-hamburger-button />
        </button>

        <NuxtLink
          to="/home"
          class="inline-flex h-10 shrink-0 items-center sm:h-12 xl:h-10"
          aria-label="Noxy home"
          @click="closeDrawer"
        >
          <NRemoteImage
            src="/images/logo.svg"
            alt="Noxy"
            class="block h-9 w-auto translate-y-0.5 sm:h-10"
            draggable="false"
          />
        </NuxtLink>

        <div class="hidden xl:block">
          <div class="search-container relative w-[26rem] 2xl:w-[31rem]">
            <div
              class="group flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#161522]/95 p-1.5 shadow-[0_12px_32px_rgb(0_0_0/22%)] backdrop-blur-xl transition focus-within:border-pink-300/55 focus-within:ring-2 focus-within:ring-pink-300/15"
            >
              <div
                class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--color-text)]/55 transition group-focus-within:bg-pink-300/12 group-focus-within:text-pink-300"
              >
                <div i-material-symbols-search-rounded class="text-xl" />
              </div>

              <input
                ref="desktopSearchInput"
                v-model="searchQuery"
                type="search"
                placeholder="Search anime titles..."
                aria-label="Search anime"
                role="combobox"
                aria-autocomplete="list"
                :aria-expanded="showSearchResults && hasSearchPanelContent"
                class="min-w-0 flex-1 appearance-none border-0 bg-transparent px-1 py-0 text-sm font-semibold text-[var(--color-heading)] shadow-none outline-none ring-0 placeholder:text-[var(--color-text)]/40 focus:border-0 focus:outline-none focus:ring-0"
                autocomplete="off"
                spellcheck="false"
                @focus="openSearchResults"
                @keydown="handleSearchKeydown($event)"
              />

              <button
                v-if="searchQuery"
                type="button"
                class="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-0 bg-transparent p-0 text-[var(--color-text)]/45 transition hover:bg-white/8 hover:text-pink-300"
                aria-label="Clear navbar search"
                @click="clearSearchInput(desktopSearchInput)"
              >
                <div i-material-symbols-close-rounded class="text-lg" />
              </button>
              <kbd
                v-else
                class="hidden h-6 min-w-6 shrink-0 place-items-center rounded-md border border-white/8 bg-white/5 px-1.5 font-lexend text-[10px] font-black text-[var(--color-text)]/35 2xl:grid"
                aria-label="Press slash to search"
              >
                /
              </kbd>

              <span class="h-6 w-px shrink-0 bg-white/10" aria-hidden="true" />

              <button
                type="button"
                class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border-0 bg-pink-300 px-3 font-lexend text-xs font-black text-[#17121d] shadow-[0_6px_18px_rgb(249_168_212/20%)] transition hover:-translate-y-px hover:bg-pink-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Open anime filters"
                title="Open advanced anime filters"
                @click="goToFilter"
              >
                <div i-material-symbols-tune-rounded class="text-base" />
                <span>Filters</span>
              </button>
            </div>

            <div
              v-if="showSearchResults && hasSearchPanelContent"
              class="absolute left-0 right-0 z-[110] mt-2 max-h-[30rem] overflow-y-auto rounded-xl border border-white/10 bg-[var(--color-background)]/98 shadow-[0_24px_70px_rgb(0_0_0/45%)] backdrop-blur-xl"
            >
              <div v-if="isSearching" class="flex items-center justify-center p-4">
                <div class="text-4xl" i-eos-icons:three-dots-loading />
              </div>

              <div v-else-if="searchError" class="p-4 text-sm text-red-400">
                {{ searchError }}
              </div>

              <div
                v-else-if="searchQuery.trim().length >= 2 && searchResults.length === 0"
                class="p-4 text-sm text-[var(--color-text)]/60"
              >
                No results found
              </div>

              <template v-else-if="searchQuery.trim().length < 2">
                <div v-if="recentSearches.length" class="border-b border-dark-300 px-3 py-2">
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <p class="text-xs font-bold uppercase text-[var(--color-text)]/45">Recent searches</p>
                    <button
                      type="button"
                      class="rounded border-0 bg-transparent px-2 py-1 text-xs font-bold text-[var(--color-text)]/60 transition hover:text-pink-300"
                      @click="userPreferences.clearRecentSearches()"
                    >
                      Clear
                    </button>
                  </div>

                  <button
                    v-for="option in searchOptions.filter((item) => item.kind === 'recent')"
                    :key="option.key"
                    type="button"
                    class="flex w-full items-center gap-2 rounded border-0 px-2 py-2 text-left text-sm font-semibold transition"
                    :class="
                      searchOptions[activeSearchIndex]?.key === option.key
                        ? 'bg-[var(--color-background-soft)] text-pink-300'
                        : 'bg-transparent text-[var(--color-heading)] hover:bg-[var(--color-background-soft)]'
                    "
                    @mousedown.prevent="goToSearchOption(option)"
                  >
                    <div i-material-symbols-history-rounded class="shrink-0 text-lg text-pink-300" />
                    <span class="truncate">{{ option.label }}</span>
                  </button>
                </div>

                <div v-if="trendingSearches.length" class="px-3 py-2">
                  <p class="mb-2 text-xs font-bold uppercase text-[var(--color-text)]/45">Trending now</p>
                  <button
                    v-for="option in searchOptions.filter((item) => item.kind === 'trending')"
                    :key="option.key"
                    type="button"
                    class="flex w-full items-center gap-2 rounded border-0 px-2 py-2 text-left text-sm font-semibold transition"
                    :class="
                      searchOptions[activeSearchIndex]?.key === option.key
                        ? 'bg-[var(--color-background-soft)] text-pink-300'
                        : 'bg-transparent text-[var(--color-heading)] hover:bg-[var(--color-background-soft)]'
                    "
                    @mousedown.prevent="goToSearchOption(option)"
                  >
                    <div i-material-symbols-trending-up-rounded class="shrink-0 text-lg text-pink-300" />
                    <span class="truncate">{{ option.label }}</span>
                  </button>
                </div>
              </template>

              <template v-else>
                <button
                  v-for="(option, optionIndex) in searchOptions"
                  :key="option.key"
                  type="button"
                  class="group flex w-full gap-3 border-0 border-b border-dark-300 p-3 text-left text-[var(--color-text)] transition last:border-b-0 hover:bg-[var(--color-background-soft)]"
                  :class="activeSearchIndex === optionIndex ? 'bg-[var(--color-background-soft)]' : 'bg-transparent'"
                  @mousedown.prevent="goToSearchOption(option)"
                >
                  <template v-if="option.kind === 'result'">
                    <NRemoteImage
                      :src="option.anime.image"
                      :alt="option.anime.title"
                      class="h-16 w-12 shrink-0 rounded object-cover"
                    />

                    <div class="min-w-0 flex-1">
                      <NTitleTransition
                        as="h2"
                        :text="selectedLanguage === 'EN' ? option.anime.title : option.anime.romajiTitle"
                        :transition-key="`${selectedLanguage}-${option.anime.id}`"
                        class="truncate text-sm font-bold text-[var(--color-heading)] transition group-hover:text-pink-300"
                      />

                      <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span class="rounded bg-pink-300 px-2 py-0.5 font-bold text-black">{{
                          option.anime.type
                        }}</span>
                        <span
                          v-if="option.anime.year"
                          class="rounded bg-[var(--vt-c-black-mute)] px-2 py-0.5 text-[var(--color-text)]/80"
                          >{{ option.anime.year }}</span
                        >
                        <span
                          v-if="option.anime.episodes"
                          class="rounded bg-[var(--vt-c-black-mute)] px-2 py-0.5 text-[var(--color-text)]/80"
                          >EP {{ option.anime.episodes }}</span
                        >
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <div i-material-symbols-search-rounded class="mt-0.5 shrink-0 text-xl text-pink-300" />
                    <div class="min-w-0">
                      <p class="truncate text-sm font-bold text-[var(--color-heading)]">{{ option.label }}</p>
                      <p class="mt-1 text-xs text-[var(--color-text)]/55">Open full filter results</p>
                    </div>
                  </template>
                </button>
              </template>
            </div>
          </div>
        </div>

        <ul class="hidden min-w-0 items-center gap-5 text-sm xl:flex 2xl:gap-8">
          <li v-for="item in firstDesktopNavItems" :key="item.label" class="flex flex-col items-center">
            <div
              v-if="item.icon"
              :class="item.action === 'random' && isRandomLoading ? 'i-eos-icons:three-dots-loading' : item.icon"
              class="text-2xl text-pink-300"
            />
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="whitespace-nowrap text-[var(--vt-c-white)] transition hover:text-pink-300"
              @click="handleNavItemClick(item, $event)"
            >
              {{ item.label }}
            </NuxtLink>
            <button
              v-else
              type="button"
              class="whitespace-nowrap border-0 bg-transparent p-0 font-lexend text-sm text-[var(--vt-c-white)] transition hover:text-pink-300"
              @click="goToRandomAnime"
            >
              {{ item.label }}
            </button>
          </li>

          <li class="flex flex-col items-center text-center leading-tight">
            <div class="flex items-center overflow-hidden">
              <button
                type="button"
                class="rounded-l border-0 px-1 text-xs font-semibold transition"
                :class="
                  selectedLanguage === 'EN'
                    ? 'bg-pink-300 text-black'
                    : 'bg-[var(--vt-c-black-mute)] text-[var(--vt-c-white)]'
                "
                @click="toggleLanguage('EN')"
              >
                EN
              </button>
              <button
                type="button"
                class="rounded-r border-0 px-2 text-xs font-semibold transition"
                :class="
                  selectedLanguage === 'RO'
                    ? 'bg-pink-300 text-black'
                    : 'bg-[var(--vt-c-black-mute)] text-[var(--vt-c-white)]'
                "
                @click="toggleLanguage('RO')"
              >
                JP
              </button>
            </div>
            <button
              type="button"
              class="mt-2 cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 font-lexend text-[var(--vt-c-white)] transition hover:text-pink-300"
              @click="toggleLanguage(selectedLanguage === 'EN' ? 'RO' : 'EN')"
            >
              <NTitleTransition
                :text="selectedLanguage === 'EN' ? 'English Name' : 'Romaji Name'"
                :transition-key="selectedLanguage"
              />
            </button>
          </li>

          <li v-for="item in lastDesktopNavItems" :key="item.label" class="flex flex-col items-center">
            <div v-if="item.icon" :class="item.icon" class="text-2xl text-pink-300" />
            <NuxtLink
              :to="item.to"
              class="whitespace-nowrap text-[var(--vt-c-white)] transition hover:text-pink-300"
              @click="handleNavItemClick(item, $event)"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <div class="flex shrink-0 items-center gap-2 md:gap-4">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-transparent bg-transparent p-0 text-[var(--color-heading)] transition hover:border-white/8 hover:bg-[var(--color-background-soft)] hover:text-pink-300 xl:hidden"
          :aria-expanded="isSearchOpen"
          aria-controls="mobile-search"
          :aria-label="isSearchOpen ? 'Close search' : 'Open search'"
          @click="toggleMobileSearch"
        >
          <div
            :class="isSearchOpen ? 'i-material-symbols-close-rounded' : 'i-material-symbols-search-rounded'"
            class="text-2xl"
          />
        </button>

        <NuxtLink
          v-if="showAuthenticatedUi"
          to="/watchlist"
          class="relative inline-flex h-10 w-10 items-center justify-center rounded text-[var(--color-heading)] no-underline transition hover:bg-[var(--color-background-soft)] hover:text-pink-300"
          aria-label="Watchlist"
        >
          <div i-material-symbols-bookmark-rounded class="text-2xl" />
          <span
            v-if="watchlistCount"
            class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-300 px-1 text-[10px] font-bold text-black"
          >
            {{ watchlistCount }}
          </span>
        </NuxtLink>

        <div class="account-container relative">
          <button
            v-if="!showAuthenticatedUi"
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded border-0 bg-transparent p-0 text-[var(--color-heading)] transition hover:bg-[var(--color-background-soft)] hover:text-pink-300"
            aria-label="Account"
            @click="openAccountModal"
          >
            <span class="grid h-8 w-8 place-items-center rounded-full bg-pink-300 text-black">
              <div i-material-symbols-person-rounded class="text-2xl" />
            </span>
          </button>

          <button
            v-else
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded border-0 bg-transparent p-0 text-[var(--color-heading)] transition hover:bg-[var(--color-background-soft)] hover:text-pink-300"
            :aria-expanded="isAccountMenuOpen"
            aria-controls="account-menu"
            aria-label="Account menu"
            @click.stop="isAccountMenuOpen = !isAccountMenuOpen"
          >
            <img
              v-if="accountAvatarUrl"
              :src="accountAvatarUrl"
              :alt="displayName"
              class="h-8 w-8 rounded-full object-cover ring-2 ring-pink-300"
            />
            <span v-else class="grid h-8 w-8 place-items-center rounded-full bg-pink-300 text-sm font-black text-black">
              {{ accountInitial }}
            </span>
          </button>

          <div
            v-if="showAuthenticatedUi && isAccountMenuOpen"
            id="account-menu"
            class="absolute right-0 top-12 z-[115] w-64 rounded border border-dark-300 bg-[var(--color-background)] p-3 shadow-xl"
          >
            <div class="border-b border-dark-300 pb-3">
              <div class="flex items-center gap-3">
                <img
                  v-if="accountAvatarUrl"
                  :src="accountAvatarUrl"
                  :alt="displayName"
                  class="h-10 w-10 rounded-full object-cover ring-2 ring-pink-300"
                />
                <span
                  v-else
                  class="grid h-10 w-10 place-items-center rounded-full bg-pink-300 text-sm font-black text-black"
                >
                  {{ accountInitial }}
                </span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-black text-[var(--color-heading)]">{{ displayName }}</p>
                  <p class="mt-1 truncate text-xs text-[var(--color-text)]/60">{{ user?.email }}</p>
                </div>
              </div>
            </div>
            <NuxtLink
              to="/profile"
              class="mt-2 flex items-center gap-2 rounded px-2 py-2 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:bg-[var(--color-background-soft)] hover:text-pink-300"
              @click="closeAccountMenu"
            >
              <div i-material-symbols-person-rounded class="text-lg text-pink-300" />
              Profile
            </NuxtLink>
            <NuxtLink
              to="/settings"
              class="mt-1 flex items-center gap-2 rounded px-2 py-2 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:bg-[var(--color-background-soft)] hover:text-pink-300"
              @click="closeAccountMenu"
            >
              <div i-material-symbols-settings-rounded class="text-lg text-pink-300" />
              Settings
            </NuxtLink>
            <NuxtLink
              to="/watchlist"
              class="mt-1 flex items-center gap-2 rounded px-2 py-2 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:bg-[var(--color-background-soft)] hover:text-pink-300"
              @click="closeAccountMenu"
            >
              <div i-material-symbols-bookmark-rounded class="text-lg text-pink-300" />
              Watchlist
            </NuxtLink>
            <button
              type="button"
              class="mt-1 flex w-full items-center gap-2 rounded border-0 bg-transparent px-2 py-2 text-left font-lexend text-sm font-bold text-[var(--color-heading)] transition hover:bg-[var(--color-background-soft)] hover:text-pink-300"
              @click="signOutAccount"
            >
              <div i-material-symbols-logout-rounded class="text-lg text-pink-300" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-show="isSearchOpen" id="mobile-search" class="mt-3 xl:hidden">
      <div class="search-container relative">
        <div
          class="group flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-[#161522]/98 p-1.5 shadow-[0_16px_40px_rgb(0_0_0/35%)] backdrop-blur-xl transition focus-within:border-pink-300/55 focus-within:ring-2 focus-within:ring-pink-300/15"
        >
          <div
            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--color-text)]/55 transition group-focus-within:bg-pink-300/12 group-focus-within:text-pink-300"
          >
            <div i-material-symbols-search-rounded class="text-xl" />
          </div>

          <input
            ref="mobileSearchInput"
            v-model="searchQuery"
            type="search"
            placeholder="Search anime titles..."
            aria-label="Search anime"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="showSearchResults && hasSearchPanelContent"
            class="min-w-0 flex-1 appearance-none border-0 bg-transparent px-1 py-0 text-sm font-semibold text-[var(--color-heading)] shadow-none outline-none ring-0 placeholder:text-[var(--color-text)]/40 focus:border-0 focus:outline-none focus:ring-0"
            autocomplete="off"
            spellcheck="false"
            @focus="openSearchResults"
            @keydown="handleSearchKeydown($event, true)"
          />

          <button
            v-if="searchQuery"
            type="button"
            class="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-0 bg-transparent p-0 text-[var(--color-text)]/45 transition hover:bg-white/8 hover:text-pink-300"
            aria-label="Clear navbar search"
            @click="clearSearchInput(mobileSearchInput)"
          >
            <div i-material-symbols-close-rounded class="text-lg" />
          </button>

          <span class="h-7 w-px shrink-0 bg-white/10" aria-hidden="true" />

          <button
            type="button"
            class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border-0 bg-pink-300 px-3 font-lexend text-xs font-black text-[#17121d] shadow-[0_6px_18px_rgb(249_168_212/20%)] transition hover:bg-pink-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Open anime filters"
            @click="goToFilter"
          >
            <div i-material-symbols-tune-rounded class="text-base" />
            <span>Filters</span>
          </button>
        </div>

        <div
          v-if="showSearchResults && hasSearchPanelContent"
          class="absolute left-0 right-0 z-[110] mt-2 max-h-[min(28rem,calc(100vh-8rem))] overflow-y-auto rounded-xl border border-white/10 bg-[var(--color-background)]/98 shadow-[0_24px_70px_rgb(0_0_0/45%)] backdrop-blur-xl"
        >
          <div v-if="isSearching" class="flex items-center justify-center p-4">
            <div class="text-4xl" i-eos-icons:three-dots-loading />
          </div>

          <div v-else-if="searchError" class="p-4 text-sm text-red-400">
            {{ searchError }}
          </div>

          <div
            v-else-if="searchQuery.trim().length >= 2 && searchResults.length === 0"
            class="p-4 text-sm text-[var(--color-text)]/60"
          >
            No results found
          </div>

          <template v-else-if="searchQuery.trim().length < 2">
            <div v-if="recentSearches.length" class="border-b border-dark-300 px-3 py-2">
              <div class="mb-2 flex items-center justify-between gap-3">
                <p class="text-xs font-bold uppercase text-[var(--color-text)]/45">Recent searches</p>
                <button
                  type="button"
                  class="rounded border-0 bg-transparent px-2 py-1 text-xs font-bold text-[var(--color-text)]/60 transition hover:text-pink-300"
                  @click="userPreferences.clearRecentSearches()"
                >
                  Clear
                </button>
              </div>

              <button
                v-for="option in searchOptions.filter((item) => item.kind === 'recent')"
                :key="option.key"
                type="button"
                class="flex w-full items-center gap-2 rounded border-0 px-2 py-2 text-left text-sm font-semibold transition"
                :class="
                  searchOptions[activeSearchIndex]?.key === option.key
                    ? 'bg-[var(--color-background-soft)] text-pink-300'
                    : 'bg-transparent text-[var(--color-heading)] hover:bg-[var(--color-background-soft)]'
                "
                @mousedown.prevent="goToSearchOption(option, true)"
              >
                <div i-material-symbols-history-rounded class="shrink-0 text-lg text-pink-300" />
                <span class="truncate">{{ option.label }}</span>
              </button>
            </div>

            <div v-if="trendingSearches.length" class="px-3 py-2">
              <p class="mb-2 text-xs font-bold uppercase text-[var(--color-text)]/45">Trending now</p>
              <button
                v-for="option in searchOptions.filter((item) => item.kind === 'trending')"
                :key="option.key"
                type="button"
                class="flex w-full items-center gap-2 rounded border-0 px-2 py-2 text-left text-sm font-semibold transition"
                :class="
                  searchOptions[activeSearchIndex]?.key === option.key
                    ? 'bg-[var(--color-background-soft)] text-pink-300'
                    : 'bg-transparent text-[var(--color-heading)] hover:bg-[var(--color-background-soft)]'
                "
                @mousedown.prevent="goToSearchOption(option, true)"
              >
                <div i-material-symbols-trending-up-rounded class="shrink-0 text-lg text-pink-300" />
                <span class="truncate">{{ option.label }}</span>
              </button>
            </div>
          </template>

          <template v-else>
            <button
              v-for="(option, optionIndex) in searchOptions"
              :key="option.key"
              type="button"
              class="group flex w-full gap-3 border-0 border-b border-dark-300 p-3 text-left text-[var(--color-text)] transition last:border-b-0 hover:bg-[var(--color-background-soft)]"
              :class="activeSearchIndex === optionIndex ? 'bg-[var(--color-background-soft)]' : 'bg-transparent'"
              @mousedown.prevent="goToSearchOption(option, true)"
            >
              <template v-if="option.kind === 'result'">
                <NRemoteImage
                  :src="option.anime.image"
                  :alt="option.anime.title"
                  class="h-16 w-12 shrink-0 rounded object-cover"
                />

                <div class="min-w-0 flex-1">
                  <NTitleTransition
                    as="h2"
                    :text="selectedLanguage === 'EN' ? option.anime.title : option.anime.romajiTitle"
                    :transition-key="`${selectedLanguage}-${option.anime.id}`"
                    class="w-full truncate text-sm font-bold text-[var(--color-heading)] transition group-hover:text-pink-300"
                  />

                  <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span class="rounded bg-pink-300 px-2 py-0.5 font-bold text-black">{{ option.anime.type }}</span>
                    <span
                      v-if="option.anime.year"
                      class="rounded bg-[var(--vt-c-black-mute)] px-2 py-0.5 text-[var(--color-text)]/80"
                      >{{ option.anime.year }}</span
                    >
                    <span
                      v-if="option.anime.episodes"
                      class="rounded bg-[var(--vt-c-black-mute)] px-2 py-0.5 text-[var(--color-text)]/80"
                      >EP {{ option.anime.episodes }}</span
                    >
                  </div>
                </div>
              </template>

              <template v-else>
                <div i-material-symbols-search-rounded class="mt-0.5 shrink-0 text-xl text-pink-300" />
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-[var(--color-heading)]">{{ option.label }}</p>
                  <p class="mt-1 text-xs text-[var(--color-text)]/55">Open full filter results</p>
                </div>
              </template>
            </button>
          </template>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200 ease-out"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <button
          v-show="isOpen"
          type="button"
          class="fixed inset-0 z-[120] border-0 bg-black/70 p-0 backdrop-blur-sm"
          aria-label="Close navigation menu"
          @click="closeDrawer"
        ></button>
      </Transition>

      <aside
        id="site-menu"
        class="site-menu-panel fixed left-0 top-0 z-[130] h-full w-[min(300px,100vw)] transform overflow-auto font-lexend transition-all duration-300 ease-in-out xl:w-[260px]"
        :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <span class="site-menu-close flex min-h-[86px] w-full items-center px-4 xl:hidden">
          <button
            type="button"
            class="flex items-center border-0 bg-transparent p-0 font-lexend text-[#f2f0f5] transition hover:text-pink-300"
            @click="closeDrawer"
          >
            <div class="text-2xl" i-ci-caret-left-sm />
            <span class="text-md">Close menu</span>
          </button>
        </span>

        <div class="site-menu-actions block border-y border-white/6 px-3 py-4 xl:hidden">
          <div class="grid grid-cols-3 items-start gap-2">
            <button
              type="button"
              class="flex min-w-0 flex-col items-center gap-1 border-0 bg-transparent p-0 text-center text-[var(--vt-c-white)] transition hover:text-pink-300"
              @click="goToRandomAnime"
            >
              <span
                :class="isRandomLoading ? 'i-eos-icons:three-dots-loading' : 'i-fe-random'"
                class="grid h-7 place-items-center text-2xl text-pink-300"
              />
              <span class="block w-full truncate text-xs font-medium">Random</span>
            </button>

            <NuxtLink
              to="/news"
              class="flex min-w-0 flex-col items-center gap-1 text-center text-[var(--vt-c-white)] no-underline transition hover:text-pink-300"
              @click="closeDrawer"
            >
              <span i-material-symbols-rss-feed class="grid h-7 place-items-center text-2xl text-pink-300" />
              <span class="block w-full truncate text-xs font-medium">News</span>
            </NuxtLink>

            <div class="flex min-w-0 flex-col items-center gap-1 text-center">
              <div class="flex h-7 items-start justify-center">
                <div class="flex h-[18px] w-[58px] items-center overflow-hidden rounded">
                  <button
                    type="button"
                    class="h-full flex-1 border-0 px-0 text-[10px] font-bold leading-none"
                    :class="
                      selectedLanguage === 'EN'
                        ? 'bg-pink-300 text-black'
                        : 'bg-[var(--vt-c-black-mute)] text-[var(--vt-c-white)]'
                    "
                    @click="toggleLanguage('EN')"
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    class="h-full flex-1 border-0 px-0 text-[10px] font-bold leading-none"
                    :class="
                      selectedLanguage === 'RO'
                        ? 'bg-pink-300 text-black'
                        : 'bg-[var(--vt-c-black-mute)] text-[var(--vt-c-white)]'
                    "
                    @click="toggleLanguage('RO')"
                  >
                    JP
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="block w-full truncate border-0 bg-transparent p-0 font-lexend text-xs font-medium text-[var(--vt-c-white)] transition hover:text-pink-300"
                @click="toggleLanguage(selectedLanguage === 'EN' ? 'RO' : 'EN')"
              >
                <NTitleTransition
                  :text="selectedLanguage === 'EN' ? 'English Name' : 'Romaji Name'"
                  :transition-key="selectedLanguage"
                />
              </button>
            </div>
          </div>

          <NuxtLink
            to="/community"
            class="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#54536f] px-4 text-sm font-medium text-white no-underline transition hover:bg-[#62617f] hover:text-pink-200"
            @click="closeDrawer"
          >
            <span i-material-symbols-groups-rounded class="text-lg text-pink-200" />
            Community
          </NuxtLink>
        </div>

        <nav class="site-menu-navigation" aria-label="Menu navigation">
          <ul class="m-0 list-none p-0">
            <li v-for="item in visibleMobileNavItems" :key="item.label" class="site-menu-nav-item">
              <NuxtLink
                :to="item.to"
                class="site-menu-link flex min-h-[55px] items-center px-4 py-3 text-sm font-semibold text-[#f2f0f5] no-underline transition hover:text-pink-200"
                @click="closeDrawer"
              >
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <section class="site-menu-genres border-t border-white/6 px-4 pb-8 pt-5">
          <h2 class="text-sm font-medium text-[#f2f0f5]">Genre</h2>

          <div class="mt-4 grid grid-cols-2 gap-x-7 gap-y-4">
            <NuxtLink
              v-for="genre in visibleMenuGenres"
              :key="genre.label"
              :to="`/genre/${encodeURIComponent(genre.label)}`"
              class="truncate text-xs font-normal no-underline transition hover:brightness-125"
              :style="{ color: genre.color }"
              @click="closeDrawer"
            >
              {{ genre.label }}
            </NuxtLink>
          </div>

          <button
            v-if="hasMoreMenuGenres"
            type="button"
            class="mt-4 inline-flex items-center gap-2 border-0 bg-transparent p-0 font-lexend text-sm text-[#f2f0f5] transition hover:text-pink-200"
            :aria-expanded="areAllMenuGenresShown"
            @click="areAllMenuGenresShown = !areAllMenuGenresShown"
          >
            <span class="text-lg font-semibold leading-none">{{ areAllMenuGenresShown ? '−' : '+' }}</span>
            <span>{{ areAllMenuGenresShown ? 'Less' : 'More' }}</span>
          </button>
        </section>
      </aside>
    </Teleport>
  </nav>
</template>

<style scoped>
a {
  text-decoration: none;
}

.site-menu-panel {
  background:
    radial-gradient(circle at 82% 33%, rgba(180, 190, 254, 0.16), transparent 25%),
    radial-gradient(circle at 34% 58%, rgba(243, 139, 168, 0.12), transparent 24%),
    radial-gradient(circle at 72% 77%, rgba(148, 226, 213, 0.12), transparent 22%), rgba(56, 55, 71, 0.96);
  box-shadow: 12px 0 32px rgba(15, 14, 24, 0.34);
  backdrop-filter: blur(18px);
  scrollbar-width: thin;
  scrollbar-color: rgba(180, 190, 254, 0.45) transparent;
}

.site-menu-close {
  background: rgba(65, 63, 80, 0.58);
}

.site-menu-actions {
  background: rgba(30, 30, 46, 0.68);
}

.site-menu-nav-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.055);
  background: rgba(66, 65, 81, 0.48);
}

.site-menu-nav-item:first-child .site-menu-link {
  min-height: 70px;
}

.site-menu-link:hover {
  background: rgba(82, 79, 99, 0.68);
}

.site-menu-genres {
  background: rgba(66, 65, 81, 0.48);
}
</style>
