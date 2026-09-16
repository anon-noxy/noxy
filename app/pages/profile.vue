<script setup lang="ts">
definePageMeta({
  middleware: ['auth-client'],
})

const { displayName, isAuthenticated, isReady, profile, user } = useSupabaseAuth()
const userPreferences = useUserPreferencesStore()
const { watchlistCount } = storeToRefs(userPreferences)

const avatarUrl = computed(() => profile.value?.avatar_url || String(user.value?.user_metadata?.avatar_url || ''))
const accountEmail = computed(() => profile.value?.email || user.value?.email || '')
const accountCreatedAt = computed(() => profile.value?.created_at || user.value?.created_at || '')
const accountInitial = computed(() => displayName.value.trim().charAt(0).toUpperCase() || 'A')
const accountBio = computed(() => profile.value?.bio?.trim() || '')
const publicProfilePath = computed(() => `/user/${encodeURIComponent(profile.value?.username || displayName.value)}`)

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

useSeoMeta({
  title: 'Profile - Noxy',
  description: 'View your Noxy profile, public information, and saved anime collection.',
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)] px-4 pb-18 pt-22 text-[var(--color-text)] sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <template v-if="!isReady">
        <header
          class="animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/60 p-5 sm:p-7 lg:p-8"
        >
          <div class="h-4 w-24 rounded bg-[var(--color-background-mute)]" />
          <div class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div class="h-28 w-28 shrink-0 rounded-full bg-[var(--color-background-mute)]" />
              <div class="min-w-0 flex-1">
                <div class="h-4 w-32 rounded bg-[var(--color-background-mute)]" />
                <div class="mt-4 h-10 w-64 max-w-full rounded bg-[var(--color-background-mute)]" />
                <div class="mt-3 h-4 w-48 rounded bg-[var(--color-background-mute)]" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div v-for="index in 3" :key="index" class="h-24 rounded-xl bg-[var(--color-background-mute)]" />
            </div>
          </div>
        </header>

        <div class="mt-5 grid animate-pulse gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <div class="h-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55" />
          <div class="h-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55" />
        </div>
      </template>

      <template v-else-if="isAuthenticated">
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

              <NuxtLink
                :to="publicProfilePath"
                class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/35 px-3 text-xs font-bold text-[var(--color-heading)] no-underline transition hover:border-pink-300/40 hover:text-pink-300"
              >
                <div i-material-symbols-public-rounded class="text-base" />
                <span class="hidden sm:inline">View public profile</span>
                <span class="sm:hidden">Public view</span>
              </NuxtLink>
            </div>

            <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)] lg:items-end">
              <div class="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                <div class="relative w-fit shrink-0">
                  <img
                    v-if="avatarUrl"
                    :src="avatarUrl"
                    :alt="displayName"
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
                  <div
                    class="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-300/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-pink-200"
                  >
                    <div i-material-symbols-account-circle-rounded class="text-base" />
                    Your Noxy profile
                  </div>
                  <h1
                    class="mt-3 truncate text-3xl font-extrabold tracking-tight text-[var(--color-heading)] sm:text-4xl lg:text-5xl"
                  >
                    {{ displayName }}
                  </h1>
                  <p class="mt-1 truncate text-sm font-medium text-[var(--color-text)]/45">{{ accountEmail }}</p>
                  <p class="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text)]/55">
                    <span i-material-symbols-calendar-month-rounded class="text-lg text-pink-300" />
                    Joined {{ formatDate(accountCreatedAt) }}
                  </p>

                  <div class="mt-5 flex flex-wrap gap-2">
                    <NuxtLink
                      to="/settings"
                      class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-0 bg-pink-300 px-4 text-sm font-black text-black no-underline transition hover:bg-pink-200"
                    >
                      <div i-material-symbols-settings-rounded class="text-lg" />
                      Edit profile
                    </NuxtLink>
                    <NuxtLink
                      to="/watchlist"
                      class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/35 px-4 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:border-pink-300/40 hover:text-pink-300"
                    >
                      <div i-material-symbols-bookmarks-rounded class="text-lg" />
                      Open watchlist
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
                  <p class="mt-3 text-2xl font-black text-[var(--color-heading)]">{{ watchlistCount }}</p>
                </div>

                <div
                  class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-3.5 sm:p-4"
                >
                  <div class="flex items-center gap-2 text-[var(--color-text)]/45">
                    <div i-material-symbols-event-rounded class="text-lg text-pink-300" />
                    <span class="text-[10px] font-black uppercase tracking-wider">Member since</span>
                  </div>
                  <p class="mt-3 text-sm font-black text-[var(--color-heading)]">
                    {{ formatMonthYear(accountCreatedAt) }}
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

        <div class="mt-5 grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-stretch">
          <section
            class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5 sm:p-6"
          >
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pink-300">About</p>
                <h2 class="mt-1 text-xl font-extrabold text-[var(--color-heading)]">Your profile bio</h2>
              </div>
              <div
                class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-pink-300/20 bg-pink-300/8 text-pink-300"
              >
                <div i-material-symbols-badge-rounded class="text-xl" />
              </div>
            </div>

            <div class="mt-5 border-t border-[var(--color-border)] pt-5">
              <p class="whitespace-pre-line text-sm leading-7 text-[var(--color-text)]/68">
                {{ accountBio || 'You have not added a bio yet. Tell the community a little about yourself.' }}
              </p>
            </div>

            <NuxtLink
              v-if="!accountBio"
              to="/settings"
              class="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-pink-300/20 bg-pink-300/8 px-3.5 text-xs font-black text-pink-200 no-underline transition hover:border-pink-300/40 hover:bg-pink-300/15"
            >
              <div i-material-symbols-edit-rounded class="text-base" />
              Add a bio
            </NuxtLink>
          </section>

          <section
            class="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5 sm:p-6"
          >
            <div
              class="pointer-events-none absolute -bottom-20 -right-14 h-48 w-48 rounded-full bg-pink-300/8 blur-3xl"
            />
            <div class="relative flex h-full flex-col">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pink-300">Your library</p>
                  <h2 class="mt-1 text-xl font-extrabold text-[var(--color-heading)]">Saved watchlist</h2>
                  <p class="mt-1 text-xs leading-5 text-[var(--color-text)]/50">
                    Keep your anime collection organized and continue where you stopped.
                  </p>
                </div>
                <div
                  class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-pink-300/20 bg-pink-300/8 text-pink-300"
                >
                  <div i-material-symbols-bookmarks-rounded class="text-xl" />
                </div>
              </div>

              <div class="mt-6 flex flex-1 flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <p class="text-5xl font-black tracking-tight text-[var(--color-heading)]">{{ watchlistCount }}</p>
                  <p class="mt-2 text-sm font-bold text-[var(--color-text)]/50">
                    {{ watchlistCount === 1 ? 'saved anime' : 'saved anime titles' }}
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <NuxtLink
                    to="/watchlist"
                    class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border-0 bg-pink-300 px-4 text-sm font-black text-black no-underline transition hover:bg-pink-200"
                  >
                    <div i-material-symbols-bookmarks-rounded class="text-lg" />
                    Manage watchlist
                  </NuxtLink>
                  <NuxtLink
                    to="/home"
                    class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/35 px-4 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:border-pink-300/40 hover:text-pink-300"
                  >
                    Browse anime
                  </NuxtLink>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section class="mt-5">
          <div class="mb-3 flex items-center justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pink-300">Shortcuts</p>
              <h2 class="mt-1 text-lg font-extrabold text-[var(--color-heading)]">Your Noxy space</h2>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <NuxtLink
              to="/settings"
              class="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/45 p-4 text-[var(--color-text)] no-underline transition hover:-translate-y-0.5 hover:border-pink-300/30 hover:bg-[var(--color-background-soft)]"
            >
              <span
                class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-background-mute)] text-pink-300 transition group-hover:bg-pink-300 group-hover:text-black"
              >
                <span i-material-symbols-settings-rounded class="text-xl" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-extrabold text-[var(--color-heading)]">Settings</span>
                <span class="mt-0.5 block text-[11px] text-[var(--color-text)]/45">Edit your profile</span>
              </span>
            </NuxtLink>

            <NuxtLink
              to="/community"
              class="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/45 p-4 text-[var(--color-text)] no-underline transition hover:-translate-y-0.5 hover:border-pink-300/30 hover:bg-[var(--color-background-soft)]"
            >
              <span
                class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-background-mute)] text-pink-300 transition group-hover:bg-pink-300 group-hover:text-black"
              >
                <span i-material-symbols-groups-rounded class="text-xl" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-extrabold text-[var(--color-heading)]">Community</span>
                <span class="mt-0.5 block text-[11px] text-[var(--color-text)]/45">Discover members</span>
              </span>
            </NuxtLink>

            <NuxtLink
              :to="publicProfilePath"
              class="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/45 p-4 text-[var(--color-text)] no-underline transition hover:-translate-y-0.5 hover:border-pink-300/30 hover:bg-[var(--color-background-soft)]"
            >
              <span
                class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-background-mute)] text-pink-300 transition group-hover:bg-pink-300 group-hover:text-black"
              >
                <span i-material-symbols-public-rounded class="text-xl" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-extrabold text-[var(--color-heading)]">Public profile</span>
                <span class="mt-0.5 block text-[11px] text-[var(--color-text)]/45">See what others see</span>
              </span>
            </NuxtLink>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>
