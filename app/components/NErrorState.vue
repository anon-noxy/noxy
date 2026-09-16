<script setup lang="ts">
withDefaults(
  defineProps<{
    statusCode?: number | string
    title?: string
    message?: string
  }>(),
  {
    statusCode: 404,
    title: 'We could not find that page',
    message: 'The link may be wrong, expired, or pointing to something that is no longer available.',
  },
)

const { isAuthenticated } = useSupabaseAuth()
</script>

<template>
  <section
    class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center px-4 py-16 text-center sm:px-6"
  >
    <div class="w-full">
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
        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center gap-2 rounded bg-pink-300 px-5 py-3 font-bold text-black no-underline transition hover:bg-pink-200"
        >
          <div i-material-symbols-home-rounded class="text-xl" />
          <span>Go home</span>
        </NuxtLink>

        <NuxtLink
          to="/filter"
          class="inline-flex items-center justify-center gap-2 rounded bg-[var(--color-background-soft)] px-5 py-3 font-bold text-[var(--color-heading)] no-underline transition hover:text-pink-300"
        >
          <div i-material-symbols-tune-rounded class="text-xl" />
          <span>Browse anime</span>
        </NuxtLink>
      </div>

      <div class="mt-8 grid gap-3 text-left sm:grid-cols-3">
        <NuxtLink
          to="/az/all"
          class="rounded bg-[var(--color-background-soft)] p-4 text-[var(--color-text)] no-underline transition hover:text-pink-300"
        >
          <div i-material-symbols-sort-by-alpha-rounded class="text-2xl text-pink-300" />
          <p class="mt-3 font-bold">A-Z list</p>
          <p class="mt-1 text-sm text-[var(--color-text)]/60">Search by title.</p>
        </NuxtLink>

        <NuxtLink
          to="/home#schedule"
          class="rounded bg-[var(--color-background-soft)] p-4 text-[var(--color-text)] no-underline transition hover:text-pink-300"
        >
          <div i-material-symbols-calendar-month-rounded class="text-2xl text-pink-300" />
          <p class="mt-3 font-bold">Schedule</p>
          <p class="mt-1 text-sm text-[var(--color-text)]/60">Check airing shows.</p>
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
    </div>
  </section>
</template>
