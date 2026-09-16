<script setup lang="ts">
type PublicProfile = {
  id: string
  username: string
  bio: string | null
  avatar_url: string | null
  created_at: string
}

type PublicWatchlistItem = {
  anime_id: number
  title: string
}

const route = useRoute()
const { isConfigured, supabase, user } = useSupabaseAuth()

const publicProfile = ref<PublicProfile | null>(null)
const watchlistItems = ref<PublicWatchlistItem[]>([])
const isLoading = ref(false)
const isLoadingWatchlist = ref(false)
const errorMessage = ref('')
const watchlistError = ref('')
const isClientReady = ref(false)

const routeUsername = computed(() =>
  String(route.params.username || '')
    .trim()
    .toLowerCase(),
)
const isOwnProfile = computed(() => Boolean(user.value?.id && publicProfile.value?.id === user.value.id))
const avatarUrl = computed(() => publicProfile.value?.avatar_url || '')
const accountInitial = computed(() => publicProfile.value?.username.trim().charAt(0).toUpperCase() || 'A')
const isInitialLoading = computed(() => !isClientReady.value || isLoading.value)
const watchlistStat = computed(() => {
  if (isLoadingWatchlist.value || watchlistError.value) return '—'

  return String(watchlistItems.value.length)
})

const formatDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatMonthYear = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const loadProfileWatchlist = async () => {
  if (!supabase || !routeUsername.value) return

  isLoadingWatchlist.value = true
  watchlistError.value = ''

  try {
    const { data, error } = await supabase.rpc('get_public_profile_watchlist', {
      profile_username: routeUsername.value,
    })

    if (error) throw error

    watchlistItems.value = (data || []) as PublicWatchlistItem[]
  } catch (error) {
    console.error('Public profile watchlist error:', error)
    watchlistError.value = 'Unable to load this saved watchlist right now.'
    watchlistItems.value = []
  } finally {
    isLoadingWatchlist.value = false
  }
}

const loadProfile = async () => {
  if (!supabase || !routeUsername.value) return

  isLoading.value = true
  errorMessage.value = ''
  watchlistError.value = ''
  publicProfile.value = null
  watchlistItems.value = []

  try {
    const { data, error } = await supabase.rpc('get_public_profile', {
      profile_username: routeUsername.value,
    })

    if (error) throw error

    const nextProfile = ((data || []) as PublicProfile[])[0] || null

    publicProfile.value = nextProfile

    if (nextProfile) {
      void loadProfileWatchlist()
    }
  } catch (error) {
    console.error('Public profile error:', error)
    errorMessage.value = 'Unable to load this profile right now. Please try again.'
  } finally {
    isLoading.value = false
  }
}

watch(routeUsername, () => {
  if (isClientReady.value) {
    void loadProfile()
  }
})

onMounted(() => {
  isClientReady.value = true
  void loadProfile()
})

useSeoMeta({
  title: () => (publicProfile.value ? `${publicProfile.value.username} - Noxy` : 'User Profile - Noxy'),
  description: () =>
    publicProfile.value
      ? `View ${publicProfile.value.username}'s public profile and saved anime on Noxy.`
      : 'View a public Noxy community profile.',
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)] px-4 pb-18 pt-22 text-[var(--color-text)] sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <section
        v-if="isClientReady && !isConfigured"
        class="flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-500/8 p-4 text-sm text-red-200"
      >
        <div i-material-symbols-cloud-off-rounded class="mt-0.5 shrink-0 text-xl" />
        <div>
          <p class="font-black">Profile connection unavailable</p>
          <p class="mt-1 leading-6 text-red-200/75">
            Add your public Supabase URL and anon key to the environment to load community profiles.
          </p>
        </div>
      </section>

      <template v-if="isInitialLoading">
        <header
          class="relative mt-5 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/60 p-5 sm:p-7 lg:p-8"
        >
          <div class="animate-pulse">
            <div class="h-4 w-28 rounded bg-[var(--color-background-mute)]" />
            <div class="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div class="h-28 w-28 shrink-0 rounded-full bg-[var(--color-background-mute)]" />
              <div class="min-w-0 flex-1">
                <div class="h-4 w-32 rounded bg-[var(--color-background-mute)]" />
                <div class="mt-4 h-9 w-64 max-w-full rounded bg-[var(--color-background-mute)]" />
                <div class="mt-3 h-4 w-48 rounded bg-[var(--color-background-mute)]" />
              </div>
              <div class="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-80">
                <div class="h-24 rounded-xl bg-[var(--color-background-mute)]" />
                <div class="h-24 rounded-xl bg-[var(--color-background-mute)]" />
              </div>
            </div>
          </div>
        </header>

        <div class="mt-5 grid animate-pulse gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <div class="h-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55" />
          <div class="h-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55" />
        </div>
      </template>

      <section
        v-else-if="errorMessage"
        class="mt-5 grid min-h-96 place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 px-6 py-12 text-center"
      >
        <div>
          <div
            class="mx-auto grid h-16 w-16 place-items-center rounded-full border border-red-300/20 bg-red-500/10 text-red-300"
          >
            <div i-material-symbols-error-outline-rounded class="text-3xl" />
          </div>
          <h1 class="mt-5 text-2xl font-extrabold text-[var(--color-heading)]">We could not load this profile</h1>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text)]/60">{{ errorMessage }}</p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-0 bg-pink-300 px-4 text-sm font-black text-black transition hover:bg-pink-200"
              @click="loadProfile"
            >
              <div i-material-symbols-refresh-rounded class="text-lg" />
              Try again
            </button>
            <NuxtLink
              to="/community"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-mute)]/35 px-4 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:border-pink-300/40 hover:text-pink-300"
            >
              Back to community
            </NuxtLink>
          </div>
        </div>
      </section>

      <section
        v-else-if="isClientReady && !publicProfile && isConfigured"
        class="mt-5 grid min-h-96 place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 px-6 py-12 text-center"
      >
        <div>
          <div
            class="mx-auto grid h-16 w-16 place-items-center rounded-full border border-pink-300/20 bg-pink-300/8 text-pink-300"
          >
            <div i-material-symbols-person-off-rounded class="text-3xl" />
          </div>
          <h1 class="mt-5 text-2xl font-extrabold text-[var(--color-heading)]">Profile not found</h1>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text)]/60">
            This member does not exist or their public profile is unavailable.
          </p>
          <NuxtLink
            to="/community"
            class="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg border-0 bg-pink-300 px-4 text-sm font-black text-black no-underline transition hover:bg-pink-200"
          >
            <div i-material-symbols-groups-rounded class="text-lg" />
            Explore community
          </NuxtLink>
        </div>
      </section>

      <template v-else-if="publicProfile">
        <header
          class="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/60 p-5 sm:p-7 lg:p-8"
        >
          <div class="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-pink-300/10 blur-3xl" />
          <div class="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-sapphire/8 blur-3xl" />

          <div class="relative">
            <div class="flex items-center justify-between gap-4">
              <NuxtLink
                to="/community"
                class="inline-flex items-center gap-1.5 text-xs font-black text-pink-300 no-underline transition hover:text-pink-200"
              >
                <div i-material-symbols-arrow-back-rounded class="text-base" />
                <span>Community</span>
              </NuxtLink>

              <span
                class="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-300/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-pink-200"
              >
                <span i-material-symbols-public-rounded class="text-sm" />
                Public profile
              </span>
            </div>

            <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)] lg:items-end">
              <div class="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                <div class="relative w-fit shrink-0">
                  <img
                    v-if="avatarUrl"
                    :src="avatarUrl"
                    :alt="publicProfile.username"
                    class="h-28 w-28 rounded-full object-cover ring-2 ring-pink-300/65 ring-offset-4 ring-offset-[var(--color-background-soft)] sm:h-32 sm:w-32"
                  />
                  <div
                    v-else
                    class="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-pink-200 to-pink-400 text-4xl font-black text-black ring-2 ring-pink-300/30 ring-offset-4 ring-offset-[var(--color-background-soft)] sm:h-32 sm:w-32"
                  >
                    {{ accountInitial }}
                  </div>
                  <div
                    class="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-4 border-[var(--color-background-soft)] bg-[var(--color-background-mute)] text-pink-300"
                  >
                    <div i-material-symbols-person-rounded class="text-lg" />
                  </div>
                </div>

                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full border border-pink-300/20 bg-pink-300/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-pink-200"
                    >
                      <span i-material-symbols-diversity-3-rounded class="text-sm" />
                      Community member
                    </span>
                    <span
                      v-if="isOwnProfile"
                      class="rounded-full bg-pink-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black"
                    >
                      You
                    </span>
                  </div>

                  <h1
                    class="mt-3 truncate text-3xl font-extrabold tracking-tight text-[var(--color-heading)] sm:text-4xl lg:text-5xl"
                  >
                    {{ publicProfile.username }}
                  </h1>
                  <p class="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text)]/55">
                    <span i-material-symbols-calendar-month-rounded class="text-lg text-pink-300" />
                    Joined {{ formatDate(publicProfile.created_at) }}
                  </p>

                  <div v-if="isOwnProfile" class="mt-5 flex flex-wrap gap-2">
                    <NuxtLink
                      to="/settings"
                      class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-0 bg-pink-300 px-4 text-sm font-black text-black no-underline transition hover:bg-pink-200"
                    >
                      <div i-material-symbols-edit-rounded class="text-lg" />
                      Edit profile
                    </NuxtLink>
                    <NuxtLink
                      to="/watchlist"
                      class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/35 px-4 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:border-pink-300/40 hover:text-pink-300"
                    >
                      <div i-material-symbols-bookmarks-rounded class="text-lg" />
                      Manage watchlist
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                <div
                  class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-3.5 sm:p-4"
                >
                  <div class="flex items-center gap-2 text-[var(--color-text)]/45">
                    <div i-material-symbols-bookmark-rounded class="text-lg text-pink-300" />
                    <span class="text-[10px] font-black uppercase tracking-wider">Saved anime</span>
                  </div>
                  <p class="mt-3 text-2xl font-black text-[var(--color-heading)]">{{ watchlistStat }}</p>
                </div>

                <div
                  class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-3.5 sm:p-4"
                >
                  <div class="flex items-center gap-2 text-[var(--color-text)]/45">
                    <div i-material-symbols-event-rounded class="text-lg text-pink-300" />
                    <span class="text-[10px] font-black uppercase tracking-wider">Member since</span>
                  </div>
                  <p class="mt-3 text-sm font-black text-[var(--color-heading)]">
                    {{ formatMonthYear(publicProfile.created_at) }}
                  </p>
                </div>

                <div
                  class="col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-3.5 sm:col-span-1 sm:p-4 lg:col-span-2 xl:col-span-1"
                >
                  <div class="flex items-center gap-2 text-[var(--color-text)]/45">
                    <div i-material-symbols-visibility-rounded class="text-lg text-pink-300" />
                    <span class="text-[10px] font-black uppercase tracking-wider">Visibility</span>
                  </div>
                  <p class="mt-3 text-sm font-black text-[var(--color-heading)]">Public</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div class="mt-5 grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <section
            class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5 sm:p-6"
          >
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pink-300">About</p>
                <h2 class="mt-1 text-xl font-extrabold text-[var(--color-heading)]">
                  Meet {{ publicProfile.username }}
                </h2>
              </div>
              <div
                class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-pink-300/20 bg-pink-300/8 text-pink-300"
              >
                <div i-material-symbols-badge-rounded class="text-xl" />
              </div>
            </div>

            <div class="mt-5 border-t border-[var(--color-border)] pt-5">
              <p class="whitespace-pre-line text-sm leading-7 text-[var(--color-text)]/68">
                {{ publicProfile.bio || 'This member has not added a bio yet.' }}
              </p>
            </div>
          </section>

          <section
            class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5 sm:p-6"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pink-300">Collection</p>
                <h2 class="mt-1 text-xl font-extrabold text-[var(--color-heading)]">Saved watchlist</h2>
                <p class="mt-1 text-xs leading-5 text-[var(--color-text)]/50">
                  Anime {{ publicProfile.username }} has saved publicly.
                </p>
              </div>
              <div
                class="inline-flex w-fit items-center gap-2 rounded-full border border-pink-300/20 bg-pink-300/8 px-3 py-1.5 text-xs font-black text-pink-200"
              >
                <div i-material-symbols-bookmark-rounded class="text-base" />
                {{ watchlistStat }}
              </div>
            </div>

            <div
              v-if="watchlistError"
              class="mt-5 flex flex-col gap-3 rounded-lg border border-red-300/20 bg-red-500/8 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-xs font-bold leading-5 text-red-200">{{ watchlistError }}</p>
              <button
                type="button"
                class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-red-300/25 bg-red-300/8 px-3 text-[11px] font-black text-red-200 transition hover:bg-red-300/15 sm:self-auto"
                :disabled="isLoadingWatchlist"
                @click="loadProfileWatchlist"
              >
                <div i-material-symbols-refresh-rounded class="text-sm" />
                Retry
              </button>
            </div>

            <div v-else-if="isLoadingWatchlist" class="mt-5 grid gap-2 sm:grid-cols-2">
              <div
                v-for="index in 4"
                :key="index"
                class="flex animate-pulse items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/30 p-3"
              >
                <div class="h-9 w-9 shrink-0 rounded-lg bg-[var(--color-background-mute)]" />
                <div class="h-3 flex-1 rounded bg-[var(--color-background-mute)]" />
              </div>
            </div>

            <div v-else-if="watchlistItems.length" class="mt-5 grid gap-2 sm:grid-cols-2">
              <NuxtLink
                v-for="(watchlistItem, index) in watchlistItems"
                :key="watchlistItem.anime_id"
                :to="`/anime/${watchlistItem.anime_id}`"
                class="group flex min-w-0 items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/30 p-3 text-[var(--color-text)] no-underline transition hover:border-pink-300/30 hover:bg-[var(--color-background-mute)]/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
              >
                <span
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-background-mute)] text-[10px] font-black text-pink-300 transition group-hover:bg-pink-300 group-hover:text-black"
                >
                  {{ String(index + 1).padStart(2, '0') }}
                </span>
                <span
                  class="min-w-0 flex-1 truncate text-sm font-extrabold text-[var(--color-heading)] transition group-hover:text-pink-300"
                >
                  {{ watchlistItem.title }}
                </span>
                <span
                  i-material-symbols-arrow-forward-rounded
                  class="shrink-0 text-lg text-[var(--color-text)]/30 transition group-hover:translate-x-0.5 group-hover:text-pink-300"
                />
              </NuxtLink>
            </div>

            <div
              v-else
              class="mt-5 grid min-h-44 place-items-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-background)]/25 px-5 py-8 text-center"
            >
              <div>
                <div i-material-symbols-bookmark-add-rounded class="mx-auto text-4xl text-pink-300/75" />
                <p class="mt-3 text-sm font-extrabold text-[var(--color-heading)]">No saved anime yet</p>
                <p class="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--color-text)]/50">
                  {{
                    isOwnProfile
                      ? 'Start saving anime and your public collection will appear here.'
                      : `${publicProfile.username} has not added anything to their public watchlist yet.`
                  }}
                </p>
                <NuxtLink
                  v-if="isOwnProfile"
                  to="/home"
                  class="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border-0 bg-pink-300 px-3.5 text-xs font-black text-black no-underline transition hover:bg-pink-200"
                >
                  Browse anime
                </NuxtLink>
              </div>
            </div>
          </section>
        </div>
      </template>
    </div>
  </main>
</template>
