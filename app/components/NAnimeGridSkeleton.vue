<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number
  }>(),
  {
    count: 12,
  },
)
</script>

<template>
  <div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
    <div v-for="item in count" :key="item" class="min-w-0 animate-pulse">
      <div class="relative aspect-[2/3] overflow-hidden rounded bg-[var(--color-background-soft)]">
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-2">
          <div class="flex items-center justify-between gap-2">
            <div class="h-4 w-8 rounded bg-pink-300/35" />
            <div class="h-4 w-12 rounded bg-white/10" />
          </div>
        </div>
      </div>

      <div class="mt-3 space-y-2">
        <div class="h-4 w-full rounded bg-[var(--color-background-soft)]" />
        <div class="h-4 w-3/4 rounded bg-[var(--color-background-soft)]" />
      </div>

      <div class="mt-3 flex items-center gap-2">
        <div class="h-3 w-10 rounded bg-[var(--color-background-soft)]" />
        <div class="h-3 w-3 rounded-full bg-[var(--color-background-soft)]" />
        <div class="h-3 w-12 rounded bg-[var(--color-background-soft)]" />
      </div>
    </div>
  </div>
</template>
