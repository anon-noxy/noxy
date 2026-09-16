<script setup lang="ts">
type CommunityProfile = {
  id: string
  username: string
  bio: string | null
  avatar_url: string | null
  created_at: string
}

type CommunitySort = 'newest' | 'oldest' | 'username'

const { isConfigured, supabase, user } = useSupabaseAuth()

const communityUsers = ref<CommunityProfile[]>([])
const searchQuery = ref('')
const sortBy = ref<CommunitySort>('newest')
const isLoading = ref(false)
const errorMessage = ref('')
const isClientReady = ref(false)

const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const isInitialLoading = computed(() => !isClientReady.value || (isLoading.value && communityUsers.value.length === 0))

const visibleUsers = computed(() => {
  const query = normalizedSearchQuery.value
  const users = query
    ? communityUsers.value.filter((communityUser) => {
        return (
          communityUser.username.toLowerCase().includes(query) ||
          (communityUser.bio || '').toLowerCase().includes(query)
        )
      })
    : [...communityUsers.value]

  return users.sort((firstUser, secondUser) => {
    if (sortBy.value === 'username') {
      return firstUser.username.localeCompare(secondUser.username, undefined, { sensitivity: 'base' })
    }

    const firstCreatedAt = new Date(firstUser.created_at).getTime() || 0
    const secondCreatedAt = new Date(secondUser.created_at).getTime() || 0

    return sortBy.value === 'oldest' ? firstCreatedAt - secondCreatedAt : secondCreatedAt - firstCreatedAt
  })
})

const joinedThisMonth = computed(() => {
  const today = new Date()

  return communityUsers.value.filter((communityUser) => {
    const joinedAt = new Date(communityUser.created_at)

    return joinedAt.getFullYear() === today.getFullYear() && joinedAt.getMonth() === today.getMonth()
  }).length
})

const newestMember = computed(() => {
  return [...communityUsers.value].sort((firstUser, secondUser) => {
    return (new Date(secondUser.created_at).getTime() || 0) - (new Date(firstUser.created_at).getTime() || 0)
  })[0]
})

const resultLabel = computed(() => {
  const count = visibleUsers.value.length

  if (normalizedSearchQuery.value) {
    return `${count} ${count === 1 ? 'match' : 'matches'}`
  }

  return `${count} ${count === 1 ? 'member' : 'members'}`
})

const formatDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const getInitial = (username: string) => {
  return username.trim().charAt(0).toUpperCase() || 'A'
}

const profilePath = (communityUser: CommunityProfile) => {
  return `/user/${encodeURIComponent(communityUser.username)}`
}

const clearSearch = () => {
  searchQuery.value = ''
}

const loadCommunityUsers = async () => {
  if (!supabase) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const { data, error } = await supabase.rpc('list_community_profiles')

    if (error) throw error

    communityUsers.value = (data || []) as CommunityProfile[]
  } catch (error) {
    console.error('Community users error:', error)
    errorMessage.value = 'Unable to load the community right now. Please try again.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  isClientReady.value = true
  void loadCommunityUsers()
})

useSeoMeta({
  title: 'Community - Noxy',
  description: 'Discover members of the Noxy anime community and explore their public profiles.',
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)] px-4 pb-18 pt-22 text-[var(--color-text)] sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <header
        class="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/60 p-5 sm:p-7 lg:p-8"
      >
        <div class="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-pink-300/10 blur-3xl" />
        <div class="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-sapphire/8 blur-3xl" />

        <div class="relative">
          <div class="flex items-center justify-between gap-4">
            <NuxtLink
              to="/home"
              class="inline-flex items-center gap-1.5 text-xs font-black text-pink-300 no-underline transition hover:text-pink-200"
            >
              <div i-material-symbols-arrow-back-rounded class="text-base" />
              <span>Back home</span>
            </NuxtLink>

            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/35 px-3.5 text-xs font-bold text-[var(--color-heading)] transition hover:border-pink-300/45 hover:text-pink-300 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!isClientReady || isLoading || !isConfigured"
              @click="loadCommunityUsers"
            >
              <div
                :class="isLoading ? 'i-eos-icons:three-dots-loading' : 'i-material-symbols-refresh-rounded'"
                class="text-lg"
              />
              <span>{{ isLoading ? 'Refreshing' : 'Refresh' }}</span>
            </button>
          </div>

          <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)] lg:items-end">
            <div class="min-w-0">
              <div
                class="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-300/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-pink-200"
              >
                <div i-material-symbols-diversity-3-rounded class="text-base" />
                Noxy Community
              </div>
              <h1
                class="mt-5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-[var(--color-heading)] sm:text-4xl lg:text-5xl"
              >
                Find your people.
                <span class="text-pink-300">Share the obsession.</span>
              </h1>
              <p class="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-text)]/65 sm:text-base sm:leading-7">
                Meet other anime fans on Noxy, discover what they are watching, and explore the profiles behind the
                community.
              </p>
            </div>

            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-3.5 sm:p-4">
                <div class="flex items-center gap-2 text-[var(--color-text)]/45">
                  <div i-material-symbols-groups-rounded class="text-lg text-pink-300" />
                  <span class="text-[10px] font-black uppercase tracking-wider">Members</span>
                </div>
                <p class="mt-3 text-2xl font-black text-[var(--color-heading)]">
                  {{ isInitialLoading ? '—' : communityUsers.length }}
                </p>
              </div>

              <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-3.5 sm:p-4">
                <div class="flex items-center gap-2 text-[var(--color-text)]/45">
                  <div i-material-symbols-person-add-rounded class="text-lg text-pink-300" />
                  <span class="text-[10px] font-black uppercase tracking-wider">This month</span>
                </div>
                <p class="mt-3 text-2xl font-black text-[var(--color-heading)]">
                  {{ isInitialLoading ? '—' : joinedThisMonth }}
                </p>
              </div>

              <div
                class="col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-3.5 sm:col-span-1 sm:p-4 lg:col-span-2 xl:col-span-1"
              >
                <div class="flex items-center gap-2 text-[var(--color-text)]/45">
                  <div i-material-symbols-auto-awesome-rounded class="text-lg text-pink-300" />
                  <span class="text-[10px] font-black uppercase tracking-wider">Newest</span>
                </div>
                <p class="mt-3 truncate text-sm font-black text-[var(--color-heading)]">
                  {{ isInitialLoading ? 'Loading…' : newestMember?.username || 'No one yet' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section
        v-if="isClientReady && !isConfigured"
        class="mt-5 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-500/8 p-4 text-sm text-red-200"
      >
        <div i-material-symbols-cloud-off-rounded class="mt-0.5 shrink-0 text-xl" />
        <div>
          <p class="font-black">Community connection unavailable</p>
          <p class="mt-1 leading-6 text-red-200/75">
            Add your public Supabase URL and anon key to the environment to load community profiles.
          </p>
        </div>
      </section>

      <section
        v-if="errorMessage"
        class="mt-5 flex flex-col gap-4 rounded-xl border border-red-300/20 bg-red-500/8 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-start gap-3">
          <div i-material-symbols-error-outline-rounded class="mt-0.5 shrink-0 text-xl text-red-300" />
          <div>
            <p class="text-sm font-black text-red-200">Something went wrong</p>
            <p class="mt-1 text-sm leading-6 text-red-200/75">{{ errorMessage }}</p>
          </div>
        </div>
        <button
          type="button"
          class="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-red-300/25 bg-red-300/8 px-3 text-xs font-black text-red-200 transition hover:bg-red-300/15 sm:self-auto"
          :disabled="isLoading"
          @click="loadCommunityUsers"
        >
          <div i-material-symbols-refresh-rounded class="text-base" />
          Try again
        </button>
      </section>

      <section
        class="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/35 p-3 sm:p-4"
        aria-label="Community directory controls"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="grid flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_11rem] lg:max-w-2xl">
            <label class="relative block">
              <span class="sr-only">Search community members</span>
              <div
                i-material-symbols-search-rounded
                class="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[var(--color-text)]/40"
              />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Search by name or bio"
                class="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/55 pl-10 pr-10 text-sm font-medium text-[var(--color-heading)] outline-none placeholder:text-[var(--color-text)]/35 focus:border-pink-300/55 focus:ring-2 focus:ring-pink-300/10"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md border-0 bg-transparent text-[var(--color-text)]/45 transition hover:bg-white/5 hover:text-pink-300"
                aria-label="Clear member search"
                @click="clearSearch"
              >
                <div i-material-symbols-close-rounded class="text-lg" />
              </button>
            </label>

            <label class="relative block">
              <span class="sr-only">Sort community members</span>
              <div
                i-material-symbols-sort-rounded
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[var(--color-text)]/40"
              />
              <select
                v-model="sortBy"
                class="h-11 w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/55 pl-10 pr-8 text-xs font-bold text-[var(--color-heading)] outline-none focus:border-pink-300/55 focus:ring-2 focus:ring-pink-300/10"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="username">Name A–Z</option>
              </select>
              <div
                i-material-symbols-keyboard-arrow-down-rounded
                class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-[var(--color-text)]/40"
              />
            </label>
          </div>

          <div class="flex items-center justify-between gap-3 lg:justify-end">
            <p class="text-xs font-bold text-[var(--color-text)]/50" aria-live="polite">
              {{ isInitialLoading ? 'Loading members…' : resultLabel }}
            </p>
            <div
              class="hidden h-px flex-1 bg-[var(--color-border)] sm:block lg:h-5 lg:w-px lg:flex-none"
              aria-hidden="true"
            />
            <p class="hidden text-xs font-semibold text-[var(--color-text)]/35 sm:block">Public profiles</p>
          </div>
        </div>
      </section>

      <section class="mt-5" aria-label="Community members">
        <div v-if="isInitialLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="index in 6"
            :key="index"
            class="min-h-60 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5"
          >
            <div class="flex items-center gap-3">
              <div class="h-16 w-16 shrink-0 rounded-full bg-[var(--color-background-mute)]" />
              <div class="min-w-0 flex-1">
                <div class="h-4 w-2/3 rounded bg-[var(--color-background-mute)]" />
                <div class="mt-2 h-3 w-1/2 rounded bg-[var(--color-background-mute)]" />
              </div>
            </div>
            <div class="mt-6 h-3 w-full rounded bg-[var(--color-background-mute)]" />
            <div class="mt-2 h-3 w-4/5 rounded bg-[var(--color-background-mute)]" />
            <div class="mt-8 h-3 w-1/3 rounded bg-[var(--color-background-mute)]" />
          </div>
        </div>

        <div v-else-if="visibleUsers.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="communityUser in visibleUsers"
            :key="communityUser.id"
            :to="profilePath(communityUser)"
            class="group relative flex min-h-60 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5 text-[var(--color-text)] no-underline transition duration-200 hover:-translate-y-1 hover:border-pink-300/30 hover:bg-[var(--color-background-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            :aria-label="`Visit ${communityUser.username}'s profile`"
          >
            <div
              class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/50 to-transparent opacity-0 transition group-hover:opacity-100"
            />

            <div class="flex min-w-0 items-start gap-4">
              <div class="relative shrink-0">
                <img
                  v-if="communityUser.avatar_url"
                  :src="communityUser.avatar_url"
                  :alt="communityUser.username"
                  class="h-16 w-16 rounded-full object-cover ring-2 ring-pink-300/55 ring-offset-2 ring-offset-[var(--color-background-soft)]"
                  loading="lazy"
                />
                <div
                  v-else
                  class="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-pink-200 to-pink-400 text-xl font-black text-black ring-2 ring-pink-300/20 ring-offset-2 ring-offset-[var(--color-background-soft)]"
                >
                  {{ getInitial(communityUser.username) }}
                </div>
                <div
                  class="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--color-background-soft)] bg-[var(--color-background-mute)] text-pink-300"
                >
                  <div i-material-symbols-person-rounded class="text-sm" />
                </div>
              </div>

              <div class="min-w-0 flex-1 pt-1">
                <div class="flex min-w-0 items-center gap-2">
                  <h2
                    class="truncate text-lg font-extrabold text-[var(--color-heading)] transition group-hover:text-pink-300"
                  >
                    {{ communityUser.username }}
                  </h2>
                  <span
                    v-if="user?.id === communityUser.id"
                    class="shrink-0 rounded-full border border-pink-300/25 bg-pink-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-pink-200"
                  >
                    You
                  </span>
                </div>
                <p class="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-text)]/45">
                  <span i-material-symbols-calendar-month-rounded class="text-sm text-pink-300/75" />
                  Joined {{ formatDate(communityUser.created_at) }}
                </p>
              </div>
            </div>

            <p class="mt-5 line-clamp-3 text-sm leading-6 text-[var(--color-text)]/65">
              {{ communityUser.bio || 'This member has not added a bio yet.' }}
            </p>

            <div
              class="mt-auto flex items-center justify-between border-t border-[var(--color-border)] pt-4 text-xs font-black"
            >
              <span class="text-[var(--color-text)]/45 transition group-hover:text-pink-200">View profile</span>
              <span
                class="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-background-mute)] text-pink-300 transition group-hover:translate-x-0.5 group-hover:bg-pink-300 group-hover:text-black"
              >
                <span i-material-symbols-arrow-forward-rounded class="text-base" />
              </span>
            </div>
          </NuxtLink>
        </div>

        <div
          v-else-if="isClientReady && isConfigured && !errorMessage"
          class="grid min-h-72 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/45 px-6 py-12 text-center"
        >
          <div>
            <div
              :class="
                normalizedSearchQuery ? 'i-material-symbols-person-search-rounded' : 'i-material-symbols-groups-rounded'
              "
              class="mx-auto text-5xl text-pink-300"
            />
            <h2 class="mt-4 text-xl font-extrabold text-[var(--color-heading)]">
              {{ normalizedSearchQuery ? 'No matching members' : 'The community is just getting started' }}
            </h2>
            <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--color-text)]/60">
              {{
                normalizedSearchQuery
                  ? `We could not find anyone matching “${searchQuery.trim()}”.`
                  : 'Registered Noxy members will appear here as they join.'
              }}
            </p>
            <button
              v-if="normalizedSearchQuery"
              type="button"
              class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border-0 bg-pink-300 px-4 text-sm font-black text-black transition hover:bg-pink-200"
              @click="clearSearch"
            >
              <div i-material-symbols-close-rounded class="text-lg" />
              Clear search
            </button>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
