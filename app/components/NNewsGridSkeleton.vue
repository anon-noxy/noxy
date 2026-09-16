<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number
  }>(),
  {
    count: 6,
  },
)
</script>

<template>
  <div class="mt-8 grid gap-4 lg:grid-cols-3">
    <article
      v-for="item in count"
      :key="item"
      class="min-h-[18rem] animate-pulse overflow-hidden rounded bg-[var(--color-background-soft)]"
    >
      <div class="aspect-video bg-[var(--color-background-mute)]" />

      <div class="p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="h-5 w-24 rounded bg-pink-300/25" />
          <div class="h-4 w-20 rounded bg-[var(--color-background-mute)]" />
        </div>

        <div class="mt-4 space-y-2">
          <div class="h-5 w-full rounded bg-[var(--color-background-mute)]" />
          <div class="h-5 w-4/5 rounded bg-[var(--color-background-mute)]" />
        </div>

        <div class="mt-4 space-y-2">
          <div class="h-3 w-full rounded bg-[var(--color-background-mute)]" />
          <div class="h-3 w-11/12 rounded bg-[var(--color-background-mute)]" />
          <div class="h-3 w-2/3 rounded bg-[var(--color-background-mute)]" />
        </div>

        <div class="mt-5 flex gap-2">
          <div class="h-5 w-16 rounded-full bg-[var(--color-background-mute)]" />
          <div class="h-5 w-20 rounded-full bg-[var(--color-background-mute)]" />
        </div>
      </div>
    </article>
  </div>
</template>
