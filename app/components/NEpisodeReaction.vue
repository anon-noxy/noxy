<script setup lang="ts">
import type { EpisodeReaction } from '~/stores/userPreferences'

type ReactionOption = {
  value: EpisodeReaction
  label: string
  icon: string
  color: string
  glow: string
}

defineProps<{
  episode: number
  reaction?: EpisodeReaction
}>()

const emit = defineEmits<{
  select: [reaction: EpisodeReaction]
}>()

const reactionOptions: ReactionOption[] = [
  {
    value: 'happy',
    label: 'Happy',
    icon: 'i-line-md-emoji-grin-filled',
    color: '#f9e2af',
    glow: 'rgba(249, 226, 175, 0.55)',
  },
  {
    value: 'sad',
    label: 'Sad',
    icon: 'i-line-md-emoji-frown-filled',
    color: '#89b4fa',
    glow: 'rgba(137, 180, 250, 0.55)',
  },
  {
    value: 'angry',
    label: 'Angry',
    icon: 'i-line-md-emoji-angry-filled',
    color: '#f38ba8',
    glow: 'rgba(243, 139, 168, 0.55)',
  },
  {
    value: 'shocked',
    label: 'Shocked',
    icon: 'i-line-md-emoji-frown-open-filled',
    color: '#cba6f7',
    glow: 'rgba(203, 166, 247, 0.55)',
  },
]
</script>

<template>
  <section class="border-t border-pink-300/15 px-4 py-5 sm:px-6 sm:py-6" aria-labelledby="episode-reaction-title">
    <div class="mx-auto max-w-2xl text-center">
      <div>
        <p id="episode-reaction-title" class="text-base font-extrabold text-[var(--color-heading)] sm:text-lg">
          How did it make you feel?
        </p>
        <p class="mt-1 text-[10px] font-semibold text-[var(--color-text)]/45 sm:text-xs">
          Pick the reaction that fits best. Select it again to clear.
        </p>
      </div>

      <div
        class="mx-auto mt-4 grid max-w-lg grid-cols-4 items-start gap-2 sm:mt-5 sm:gap-5"
        role="group"
        :aria-label="`Reaction to Episode ${episode}`"
      >
        <button
          v-for="option in reactionOptions"
          :key="option.value"
          type="button"
          class="group flex min-w-0 appearance-none flex-col items-center gap-2 border-0 bg-transparent p-0 font-bold outline-none"
          :aria-pressed="reaction === option.value"
          :aria-label="`${option.label} reaction`"
          @click="emit('select', option.value)"
        >
          <span
            :class="[
              option.icon,
              reaction === option.value
                ? 'scale-110 opacity-100'
                : 'opacity-45 group-hover:scale-105 group-hover:opacity-100 group-focus-visible:opacity-100',
            ]"
            class="text-5xl transition duration-200 group-focus-visible:scale-105 sm:text-6xl"
            :style="{
              color: option.color,
              filter: reaction === option.value ? `drop-shadow(0 0 12px ${option.glow})` : undefined,
            }"
            aria-hidden="true"
          />
          <span
            class="truncate text-[10px] transition sm:text-xs"
            :class="
              reaction === option.value ? '' : 'text-[var(--color-text)]/45 group-hover:text-[var(--color-heading)]'
            "
            :style="reaction === option.value ? { color: option.color } : undefined"
          >
            {{ option.label }}
          </span>
        </button>
      </div>
    </div>
  </section>
</template>
