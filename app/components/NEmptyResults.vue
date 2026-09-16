<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    message: string
  }>(),
  {
    eyebrow: 'No Results',
  },
)
</script>

<template>
  <section class="mt-8 rounded bg-[var(--color-background-soft)] px-5 py-10 text-center sm:px-8">
    <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-300/15 text-pink-300">
      <div i-material-symbols-search-off-rounded class="text-4xl" />
    </div>

    <p class="mt-5 text-xs font-black uppercase tracking-[0.22em] text-pink-300">{{ eyebrow }}</p>
    <h2 class="mt-2 text-2xl font-extrabold text-[var(--color-heading)]">{{ title }}</h2>
    <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-text)]/70">
      {{ message }}
    </p>

    <div class="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
      <slot name="actions">
        <NuxtLink
          to="/filter"
          class="inline-flex items-center justify-center gap-2 rounded bg-pink-300 px-5 py-3 text-sm font-bold text-black no-underline transition hover:opacity-85"
        >
          <div i-material-symbols-tune-rounded class="text-lg" />
          <span>Browse anime</span>
        </NuxtLink>

        <NuxtLink
          to="/home"
          class="inline-flex items-center justify-center gap-2 rounded bg-[var(--color-background-mute)] px-5 py-3 text-sm font-bold text-[var(--color-heading)] no-underline transition hover:text-pink-300"
        >
          <div i-material-symbols-home-rounded class="text-lg" />
          <span>Go home</span>
        </NuxtLink>
      </slot>
    </div>
  </section>
</template>
