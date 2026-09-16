<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => props.error?.statusCode || 500)
const statusMessage = computed(() => props.error?.statusMessage || props.error?.message || '')
const { isAuthenticated } = useSupabaseAuth()

const title = computed(() => {
  if (statusCode.value === 404) return 'Page not found'
  if (statusCode.value === 400) return 'Something looks off'

  return 'Something went wrong'
})

const message = computed(() => {
  if (statusCode.value === 404) {
    return 'The page or anime you opened may have moved, expired, or never existed.'
  }

  if (statusMessage.value) {
    return statusMessage.value
  }

  return 'The request did not land cleanly, but you can head back and keep browsing.'
})

const goHome = () => clearError({ redirect: '/' })
const goBack = () => {
  if (import.meta.client && window.history.length > 1) {
    clearError()
    window.history.back()
    return
  }

  goHome()
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-background)] font-lexend text-[var(--color-text)]">
    <NHeader />

    <main class="flex min-h-screen items-center justify-center px-4 pb-16 pt-28 sm:px-6">
      <section class="w-full max-w-2xl text-center">
        <div
          class="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-pink-300 text-black shadow-lg shadow-pink-300/20"
        >
          <div i-material-symbols-travel-explore-rounded class="text-4xl" />
        </div>

        <p class="mt-6 text-sm font-extrabold uppercase tracking-[0.25em] text-pink-300">Error {{ statusCode }}</p>

        <h1 class="mt-3 text-4xl font-extrabold leading-tight text-[var(--color-heading)] sm:text-5xl">
          {{ title }}
        </h1>

        <p class="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--color-text)]/75">
          {{ message }}
        </p>

        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded bg-pink-300 px-5 py-3 font-bold text-black transition hover:bg-pink-200"
            @click="goHome"
          >
            <div i-material-symbols-home-rounded class="text-xl" />
            <span>Go home</span>
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded bg-[var(--color-background-soft)] px-5 py-3 font-bold text-[var(--color-heading)] transition hover:text-pink-300"
            @click="goBack"
          >
            <div i-material-symbols-arrow-back-rounded class="text-xl" />
            <span>Go back</span>
          </button>
        </div>

        <div class="mt-8 grid gap-3 text-left sm:grid-cols-3">
          <NuxtLink
            to="/filter"
            class="rounded bg-[var(--color-background-soft)] p-4 text-[var(--color-text)] no-underline transition hover:text-pink-300"
          >
            <div i-material-symbols-tune-rounded class="text-2xl text-pink-300" />
            <p class="mt-3 font-bold">Browse anime</p>
            <p class="mt-1 text-sm text-[var(--color-text)]/60">Find something by genre or status.</p>
          </NuxtLink>

          <NuxtLink
            to="/az/all"
            class="rounded bg-[var(--color-background-soft)] p-4 text-[var(--color-text)] no-underline transition hover:text-pink-300"
          >
            <div i-material-symbols-sort-by-alpha-rounded class="text-2xl text-pink-300" />
            <p class="mt-3 font-bold">A-Z list</p>
            <p class="mt-1 text-sm text-[var(--color-text)]/60">Search titles alphabetically.</p>
          </NuxtLink>

          <NuxtLink
            v-if="isAuthenticated"
            to="/watchlist"
            class="rounded bg-[var(--color-background-soft)] p-4 text-[var(--color-text)] no-underline transition hover:text-pink-300"
          >
            <div i-material-symbols-bookmark-rounded class="text-2xl text-pink-300" />
            <p class="mt-3 font-bold">Watchlist</p>
            <p class="mt-1 text-sm text-[var(--color-text)]/60">Return to saved shows.</p>
          </NuxtLink>
        </div>
      </section>
    </main>
  </div>
</template>
