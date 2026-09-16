<script setup lang="ts">
import { WATCHLIST_STATUSES, type WatchlistAnime, type WatchlistStatus } from '~/stores/userPreferences'

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

definePageMeta({
  middleware: ['auth-client'],
})

const userPreferences = useUserPreferencesStore()
const { defaultWatchLanguage, watchlist } = storeToRefs(userPreferences)
const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))
const { isAuthenticated, isReady } = useSupabaseAuth()
const { openAuthModal } = useAuthModal()

const activeStatus = ref<WatchlistStatus | 'all'>('all')
const searchQuery = ref('')
const sortBy = ref('updated')
const importInput = ref<HTMLInputElement | null>(null)
const selectedAnimeIds = ref<number[]>([])
const bulkStatus = ref<WatchlistStatus>('watching')
const currentEpisodeTotals = ref<Record<number, number>>({})
let episodeTotalsRequestId = 0

const watchlistAnimeIds = computed(() => {
  return Array.from(new Set(watchlist.value.map((anime) => anime.id))).sort((left, right) => left - right)
})

const fetchCurrentEpisodeTotals = async () => {
  if (!import.meta.client) return

  const requestId = ++episodeTotalsRequestId
  const animeIds = watchlistAnimeIds.value

  if (!animeIds.length) {
    currentEpisodeTotals.value = {}
    return
  }

  const results = await Promise.all(
    animeIds.map(async (animeId) => {
      try {
        const details = await $fetch<WatchlistEpisodeDetails>(`/api/myanimelist/${animeId}`)

        return [animeId, getAvailableEpisodeNumbers(details).length] as const
      } catch {
        return [animeId, 0] as const
      }
    }),
  )

  if (requestId !== episodeTotalsRequestId) return

  currentEpisodeTotals.value = results.reduce<Record<number, number>>((totals, [animeId, episodeCount]) => {
    if (episodeCount > 0) {
      totals[animeId] = episodeCount
    }

    return totals
  }, {})
}

watch(
  watchlistAnimeIds,
  () => {
    void fetchCurrentEpisodeTotals()
  },
  { immediate: true },
)

const { resume: resumeEpisodeTotalsRefresh, pause: pauseEpisodeTotalsRefresh } = useIntervalFn(
  () => {
    void fetchCurrentEpisodeTotals()
  },
  5 * 60 * 1000,
  { immediate: false },
)

useEventListener(import.meta.client ? window : null, 'focus', fetchCurrentEpisodeTotals)

onMounted(() => {
  resumeEpisodeTotalsRefresh()
})

onBeforeUnmount(() => {
  pauseEpisodeTotalsRefresh()
})

const getProgress = (anime: WatchlistAnime) => {
  return userPreferences.getWatchlistProgress(anime.id, currentEpisodeTotals.value[anime.id] || anime.episodes)
}

const statusTabs = computed(() => {
  return [
    { value: 'all' as const, label: 'All', count: watchlist.value.length },
    ...WATCHLIST_STATUSES.map((status) => ({
      ...status,
      count: watchlist.value.filter((anime) => anime.status === status.value).length,
    })),
  ]
})

const filteredWatchlist = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return watchlist.value
    .filter((anime) => activeStatus.value === 'all' || anime.status === activeStatus.value)
    .filter((anime) => !query || anime.title.toLowerCase().includes(query))
    .sort((left, right) => {
      const leftProgress = getProgress(left)
      const rightProgress = getProgress(right)

      if (sortBy.value === 'title') {
        return left.title.localeCompare(right.title)
      }

      if (sortBy.value === 'added') {
        return right.addedAt - left.addedAt
      }

      if (sortBy.value === 'least-progress') {
        return leftProgress.percent - rightProgress.percent || left.title.localeCompare(right.title)
      }

      if (sortBy.value === 'most-progress') {
        return rightProgress.percent - leftProgress.percent || left.title.localeCompare(right.title)
      }

      if (sortBy.value === 'next-episode') {
        return leftProgress.nextEpisode - rightProgress.nextEpisode || left.title.localeCompare(right.title)
      }

      if (sortBy.value === 'completed-first') {
        return (
          Number(rightProgress.percent >= 100) - Number(leftProgress.percent >= 100) ||
          rightProgress.percent - leftProgress.percent
        )
      }

      return right.updatedAt - left.updatedAt
    })
})

const selectedWatchlist = computed(() => {
  const selectedIds = new Set(selectedAnimeIds.value)

  return watchlist.value.filter((anime) => selectedIds.has(anime.id))
})

const statusLabel = (status: WatchlistStatus) => {
  return WATCHLIST_STATUSES.find((item) => item.value === status)?.label || 'Plan to Watch'
}

const updateStatus = (anime: WatchlistAnime, status: WatchlistStatus) => {
  userPreferences.updateWatchlistStatus(anime.id, status)
  userPreferences.pushToast(`${anime.title} moved to ${statusLabel(status)}`, 'success')
}

const isSelected = (animeId: number) => {
  return selectedAnimeIds.value.includes(animeId)
}

const toggleSelectedAnime = (animeId: number) => {
  selectedAnimeIds.value = isSelected(animeId)
    ? selectedAnimeIds.value.filter((id) => id !== animeId)
    : [...selectedAnimeIds.value, animeId]
}

const clearSelection = () => {
  selectedAnimeIds.value = []
}

const resetFilters = () => {
  activeStatus.value = 'all'
  searchQuery.value = ''
}

const applyBulkStatus = () => {
  const selectedItems = selectedWatchlist.value

  selectedItems.forEach((anime) => {
    userPreferences.updateWatchlistStatus(anime.id, bulkStatus.value)
  })
  userPreferences.pushToast(`${selectedItems.length} anime moved to ${statusLabel(bulkStatus.value)}`, 'success')
  clearSelection()
}

const removeSelected = () => {
  const selectedItems = selectedWatchlist.value

  selectedItems.forEach((anime) => {
    userPreferences.toggleWatchlist(anime)
  })
  userPreferences.pushToast(`Removed ${selectedItems.length} anime from watchlist`, 'info')
  clearSelection()
}

const markSelectedCompleted = () => {
  const selectedItems = selectedWatchlist.value

  selectedItems.forEach((anime) => {
    const totalEpisodes = getProgress(anime).total || anime.episodes || 0

    if (totalEpisodes) {
      userPreferences.markEpisodesWatched(
        {
          id: anime.id,
          title: anime.title,
          image: anime.image,
          language: defaultWatchLanguage.value,
        },
        Array.from({ length: totalEpisodes }, (_, index) => index + 1),
      )
    }

    userPreferences.updateWatchlistStatus(anime.id, 'completed')
  })
  userPreferences.pushToast(`${selectedItems.length} anime marked completed`, 'success')
  clearSelection()
}

const nextEpisodeTo = (anime: WatchlistAnime) => {
  const progress = getProgress(anime)

  if (!progress.nextEpisode) return `/anime/${anime.id}`

  return `/watch/${anime.id}?episode=${progress.nextEpisode}&language=${defaultWatchLanguage.value}`
}

const clearWatchlist = () => {
  userPreferences.clearWatchlist()
  userPreferences.pushToast('Watchlist cleared', 'info')
}

const exportWatchlist = () => {
  if (!import.meta.client) return

  const backup = userPreferences.exportUserData()
  const blob = new Blob([backup], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)

  link.href = url
  link.download = `noxy-watchlist-${date}.json`
  link.click()
  URL.revokeObjectURL(url)
  userPreferences.pushToast('Watchlist backup exported', 'success')
}

const openImportPicker = () => {
  importInput.value?.click()
}

const importWatchlist = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  try {
    userPreferences.importUserData(await file.text())
    userPreferences.pushToast('Watchlist backup imported', 'success')
  } catch {
    userPreferences.pushToast('Unable to import that backup file', 'error')
  } finally {
    input.value = ''
  }
}

useSeoMeta({
  title: 'Watchlist - Noxy',
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)] px-4 pb-16 pt-22 text-[var(--color-text)] sm:px-6 lg:px-8">
    <div v-if="isReady && isAuthenticated" class="mx-auto max-w-7xl">
      <header
        class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5 sm:p-6"
      >
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="min-w-0">
            <NuxtLink
              to="/home"
              class="inline-flex items-center gap-1.5 text-xs font-black text-pink-300 no-underline transition hover:text-pink-200"
            >
              <div i-material-symbols-arrow-back-rounded class="text-base" />
              <span>Back home</span>
            </NuxtLink>
            <h1 class="mt-4 text-3xl font-extrabold tracking-tight text-[var(--color-heading)] sm:text-4xl">
              Watchlist
            </h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text)]/65">
              Keep your saved anime organized and continue from where you stopped.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            <input
              ref="importInput"
              type="file"
              accept="application/json,.json"
              class="hidden"
              @change="importWatchlist"
            />
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-mute)]/35 px-3.5 text-xs font-bold text-[var(--color-heading)] transition hover:border-pink-300/45 hover:text-pink-300"
              @click="openImportPicker"
            >
              <div i-material-symbols-upload-file-rounded class="text-lg" />
              <span>Import</span>
            </button>
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-mute)]/35 px-3.5 text-xs font-bold text-[var(--color-heading)] transition hover:border-pink-300/45 hover:text-pink-300"
              @click="exportWatchlist"
            >
              <div i-material-symbols-download-rounded class="text-lg" />
              <span>Export</span>
            </button>
            <button
              v-if="watchlist.length"
              type="button"
              class="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-transparent px-3.5 text-xs font-bold text-[var(--color-text)]/70 transition hover:border-red-300/40 hover:text-red-300 sm:col-span-1"
              @click="clearWatchlist"
            >
              <div i-material-symbols-delete-outline-rounded class="text-lg" />
              <span>Clear watchlist</span>
            </button>
          </div>
        </div>
      </header>

      <template v-if="watchlist.length">
        <section
          class="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/35 p-3 sm:p-4"
        >
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div class="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
              <button
                v-for="status in statusTabs"
                :key="status.value"
                type="button"
                class="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition"
                :class="
                  activeStatus === status.value
                    ? 'border-pink-300/35 bg-pink-300/15 text-pink-200'
                    : 'border-transparent bg-transparent text-[var(--color-heading)]/70 hover:bg-white/5 hover:text-pink-300'
                "
                @click="activeStatus = status.value"
              >
                <span>{{ status.label }}</span>
                <span
                  class="grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px]"
                  :class="
                    activeStatus === status.value
                      ? 'bg-pink-300/15 text-pink-200'
                      : 'bg-[var(--color-background-mute)] text-[var(--color-text)]/55'
                  "
                >
                  {{ status.count }}
                </span>
              </button>
            </div>

            <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem] xl:w-[36rem]">
              <label class="relative block">
                <span class="sr-only">Search watchlist</span>
                <div
                  i-material-symbols-search-rounded
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[var(--color-text)]/45"
                />
                <input
                  v-model="searchQuery"
                  type="search"
                  placeholder="Search your watchlist"
                  class="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/55 pl-9 pr-3 text-sm font-medium text-[var(--color-heading)] outline-none placeholder:text-[var(--color-text)]/40 focus:border-pink-300/55 focus:ring-2 focus:ring-pink-300/10"
                />
              </label>

              <select
                v-model="sortBy"
                class="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/55 px-3 text-xs font-bold text-[var(--color-heading)] outline-none focus:border-pink-300/55 focus:ring-2 focus:ring-pink-300/10"
              >
                <option value="updated">Recently Updated</option>
                <option value="added">Recently Added</option>
                <option value="title">Title A-Z</option>
                <option value="least-progress">Least Progress</option>
                <option value="most-progress">Most Progress</option>
                <option value="next-episode">Next Episode</option>
                <option value="completed-first">Completed First</option>
              </select>
            </div>
          </div>
        </section>

        <section
          v-if="selectedWatchlist.length"
          class="mt-4 flex flex-col gap-3 rounded-xl border border-pink-300/25 bg-pink-300/5 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-heading)]">
            <span class="grid h-7 min-w-7 place-items-center rounded-full bg-pink-300/15 px-2 text-xs text-pink-200">
              {{ selectedWatchlist.length }}
            </span>
            <span>selected</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <select
              v-model="bulkStatus"
              class="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/55 px-3 text-xs font-bold text-[var(--color-heading)] outline-none focus:border-pink-300/55"
              aria-label="Bulk status"
            >
              <option v-for="status in WATCHLIST_STATUSES" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>
            <button
              type="button"
              class="h-9 rounded-lg border-0 bg-pink-300 px-3 text-xs font-black text-black transition hover:bg-pink-200"
              @click="applyBulkStatus"
            >
              Move status
            </button>
            <button
              type="button"
              class="h-9 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-xs font-bold text-[var(--color-heading)] transition hover:border-pink-300/45 hover:text-pink-300"
              @click="markSelectedCompleted"
            >
              Mark completed
            </button>
            <button
              type="button"
              class="h-9 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-xs font-bold text-[var(--color-heading)] transition hover:border-red-300/40 hover:text-red-300"
              @click="removeSelected"
            >
              Remove
            </button>
            <button
              type="button"
              class="h-9 rounded-lg border-0 bg-transparent px-3 text-xs font-bold text-[var(--color-text)]/60 transition hover:text-pink-300"
              @click="clearSelection"
            >
              Cancel
            </button>
          </div>
        </section>

        <section class="mt-5">
          <div v-if="filteredWatchlist.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="anime in filteredWatchlist"
              :key="anime.id"
              class="relative grid min-w-0 grid-cols-[96px_minmax(0,1fr)] gap-4 rounded-xl border bg-[var(--color-background-soft)]/65 p-3.5 transition hover:-translate-y-0.5"
              :class="
                isSelected(anime.id)
                  ? 'border-pink-300/65 shadow-[0_0_0_1px_rgb(245_194_231/10%)]'
                  : 'border-[var(--color-border)] hover:border-pink-300/25'
              "
            >
              <label
                class="absolute left-2.5 top-2.5 z-10 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-black/70"
              >
                <span class="sr-only">Select {{ anime.title }}</span>
                <input
                  type="checkbox"
                  class="h-3.5 w-3.5 accent-pink-300"
                  :checked="isSelected(anime.id)"
                  @change="toggleSelectedAnime(anime.id)"
                />
              </label>
              <NAnimeHoverCard :anime-id="anime.id">
                <NuxtLink :to="`/anime/${anime.id}`" class="group block text-[var(--color-text)] no-underline">
                  <NRemoteImage
                    v-if="anime.image"
                    :src="anime.image"
                    :alt="anime.title"
                    class="aspect-[2/3] w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div v-else class="aspect-[2/3] w-full rounded-lg bg-[var(--color-background-mute)]" />
                </NuxtLink>
              </NAnimeHoverCard>

              <div class="flex min-w-0 flex-col">
                <div class="flex min-w-0 items-start gap-2">
                  <NuxtLink
                    :to="`/anime/${anime.id}`"
                    class="block min-w-0 flex-1 text-sm font-extrabold leading-5 text-white no-underline transition hover:text-pink-300"
                  >
                    <NTitleTransition
                      :text="anime.title"
                      :title="anime.title"
                      :transition-key="`${selectedLanguage}-${anime.id}`"
                      class="line-clamp-2"
                    />
                  </NuxtLink>
                  <span
                    class="shrink-0 rounded-full border border-pink-300/20 bg-pink-300/10 px-2 py-0.5 text-[10px] font-black text-pink-200"
                  >
                    {{ statusLabel(anime.status) }}
                  </span>
                </div>

                <div class="mt-4 space-y-2">
                  <div class="flex items-center justify-between gap-2 text-[11px] font-bold">
                    <span>{{ getProgress(anime).watched }} / {{ getProgress(anime).total || '?' }} watched</span>
                    <span class="text-pink-200">{{ getProgress(anime).percent }}%</span>
                  </div>
                  <div class="h-1.5 overflow-hidden rounded bg-white/10">
                    <div class="h-full rounded bg-pink-300" :style="{ width: `${getProgress(anime).percent}%` }" />
                  </div>
                  <div class="text-[11px] font-bold text-[var(--color-text)]/55">
                    {{ getProgress(anime).nextEpisode ? `Next episode ${getProgress(anime).nextEpisode}` : 'Completed' }}
                  </div>
                </div>

                <div class="mt-auto flex items-center gap-2 pt-4">
                  <select
                    :value="anime.status"
                    class="h-9 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/45 px-2.5 text-[11px] font-bold text-[var(--color-heading)] outline-none focus:border-pink-300/55"
                    :aria-label="`Change ${anime.title} status`"
                    @change="updateStatus(anime, ($event.target as HTMLSelectElement).value as WatchlistStatus)"
                  >
                    <option v-for="status in WATCHLIST_STATUSES" :key="status.value" :value="status.value">
                      {{ status.label }}
                    </option>
                  </select>
                  <NuxtLink
                    :to="nextEpisodeTo(anime)"
                    class="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-pink-300 px-3 text-xs font-black text-black no-underline transition hover:bg-pink-200"
                    :aria-label="`Open next episode for ${anime.title}`"
                  >
                    <div i-material-symbols-play-arrow-rounded class="text-lg" />
                    <span class="hidden lg:inline">Continue</span>
                  </NuxtLink>
                </div>
              </div>
            </article>
          </div>

          <div
            v-else
            class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/45 px-6 py-12 text-center"
          >
            <div
              i-material-symbols-filter-list-off-rounded
              class="mx-auto text-4xl text-[var(--color-text)]/35"
            />
            <p class="mt-4 text-sm font-semibold text-[var(--color-text)]/70">
              No saved anime match those filters.
            </p>
            <button
              type="button"
              class="mt-5 rounded-lg border-0 bg-pink-300 px-4 py-2 text-sm font-black text-black transition hover:bg-pink-200"
              @click="resetFilters"
            >
              Reset filters
            </button>
          </div>
        </section>
      </template>

      <section
        v-else
        class="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/45 px-6 py-12 text-center"
      >
        <div i-material-symbols-bookmark-add-rounded class="mx-auto text-5xl text-pink-300" />
        <h2 class="mt-4 text-xl font-extrabold text-[var(--color-heading)]">Your watchlist is empty</h2>
        <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--color-text)]/65">
          Save anime from the catalog and they will appear here, ready to organize and continue watching.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <NuxtLink
            to="/home#schedule"
            class="rounded-lg bg-pink-300 px-4 py-2 text-sm font-black text-black no-underline transition hover:bg-pink-200"
          >
            Browse schedule
          </NuxtLink>
          <NuxtLink
            to="/category/trending"
            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-mute)]/35 px-4 py-2 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:border-pink-300/40 hover:text-pink-300"
          >
            Browse trending
          </NuxtLink>
        </div>
      </section>
    </div>

    <div
      v-else
      class="mx-auto max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-8 text-center"
    >
      <div i-material-symbols-lock-rounded class="mx-auto text-4xl text-pink-300" />
      <h1 class="mt-4 text-2xl font-extrabold text-[var(--color-heading)]">Sign in to view your watchlist</h1>
      <p class="mt-2 text-sm leading-6 text-[var(--color-text)]/65">Your saved anime are tied to your account.</p>
      <button
        type="button"
        class="mt-6 inline-flex items-center justify-center rounded-lg bg-pink-300 px-5 py-2.5 text-sm font-black text-black no-underline transition hover:bg-pink-200"
        @click="openAuthModal('login', '/watchlist')"
      >
        Sign in
      </button>
    </div>
  </main>
</template>
