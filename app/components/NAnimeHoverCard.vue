<script setup lang="ts">
type AnimeDetails = {
  id: number
  title?: {
    english?: string
    romaji?: string
    native?: string
    userPreferred?: string
  }
  description?: string
  format?: string
  status?: string
  episodes?: number
  duration?: number
  season?: string
  seasonYear?: number
  averageScore?: number
  genres?: string[]
  synonyms?: string[]
  countryOfOrigin?: string
  source?: string
  coverImage?: {
    large?: string
    extraLarge?: string
    color?: string
  }
  studios?: {
    nodes?: Array<{
      id: number
      name: string
    }>
  }
}

const props = withDefaults(
  defineProps<{
    animeId: number
    hideFormatAndGenres?: boolean
  }>(),
  {
    hideFormatAndGenres: false,
  },
)

const { getAnimeHoverDetails } = useAnimeHoverDetails()
const selectedLanguage = inject<Ref<string>>('selectedLanguage', ref('EN'))
const { getAnimeTitle } = useAnimeTitle(selectedLanguage)
const { cleanAnimeInlineDescription, formatAnimeText } = useAnimeFormatters()
const { isAnimeSaved, toggleAnimeSaved } = useAnimeWatchlist()
const route = useRoute()

const triggerRef = ref<HTMLElement | null>(null)
const details = ref<AnimeDetails | null>(null)
const isOpen = ref(false)
const isLoading = ref(false)
const position = reactive({
  left: 0,
  top: 0,
})

let isDisposed = false

const canHover = () => {
  return import.meta.client && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

const formatText = (value?: string) => formatAnimeText(value, 'Unknown')

const cleanDescription = computed(() => {
  return cleanAnimeInlineDescription(details.value?.description)
})

const title = computed(() => {
  return getAnimeTitle(details.value?.title, details.value ? 'Untitled' : 'Loading...')
})

const image = computed(() => {
  return details.value?.coverImage?.large || details.value?.coverImage?.extraLarge || ''
})

const studios = computed(() => {
  return details.value?.studios?.nodes?.map((studio) => studio.name).join(', ') || ''
})

const otherNames = computed(() => {
  return details.value?.synonyms?.filter(Boolean).slice(0, 2).join(', ') || ''
})

const isSaved = computed(() => {
  return isAnimeSaved(details.value?.id)
})

const toggleSaved = () => {
  if (!details.value) return

  toggleAnimeSaved({
    id: details.value.id,
    title: title.value,
    image: image.value,
  })
}

const updatePosition = () => {
  const trigger = triggerRef.value

  if (!trigger || !import.meta.client) return

  const rect = trigger.getBoundingClientRect()
  const popoverWidth = 320
  const popoverHeight = 440
  const gap = 14
  const padding = 12
  const hasRoomRight = rect.right + gap + popoverWidth <= window.innerWidth - padding
  const hasRoomLeft = rect.left - gap - popoverWidth >= padding

  if (hasRoomRight) {
    position.left = rect.right + gap
  } else if (hasRoomLeft) {
    position.left = rect.left - gap - popoverWidth
  } else {
    position.left = Math.max(padding, window.innerWidth - popoverWidth - padding)
  }

  position.top = Math.min(
    Math.max(padding, rect.top + rect.height / 2 - popoverHeight / 2),
    Math.max(padding, window.innerHeight - popoverHeight - padding),
  )
}

const loadDetails = async () => {
  if (details.value || isLoading.value) return

  isLoading.value = true

  try {
    const hoverDetails = await getAnimeHoverDetails(props.animeId)

    if (!isDisposed) {
      details.value = hoverDetails
    }
  } catch {
    // Hover details are optional; keep the card in its loading shell when unavailable.
  } finally {
    if (!isDisposed) {
      isLoading.value = false
    }
  }
}

const { start: startOpenTimer, stop: stopOpenTimer } = useTimeoutFn(
  () => {
    void loadDetails()
  },
  450,
  { immediate: false },
)
const { start: startCloseTimer, stop: stopCloseTimer } = useTimeoutFn(
  () => {
    isOpen.value = false
  },
  120,
  { immediate: false },
)

const open = () => {
  if (!canHover()) return

  stopCloseTimer()

  updatePosition()
  isOpen.value = true

  if (details.value) return

  stopOpenTimer()
  startOpenTimer()
}

const close = () => {
  stopOpenTimer()
  startCloseTimer()
}

const closeImmediately = () => {
  stopOpenTimer()
  stopCloseTimer()
  isOpen.value = false
}

const keepOpen = () => {
  stopCloseTimer()
}

useEventListener(import.meta.client ? window : null, 'scroll', updatePosition, { capture: true })
useEventListener(import.meta.client ? window : null, 'resize', updatePosition)

onBeforeUnmount(() => {
  isDisposed = true
  closeImmediately()
})

watch(() => route.fullPath, closeImmediately)
</script>

<template>
  <div
    ref="triggerRef"
    class="h-full min-w-0"
    @pointerdown.capture="closeImmediately"
    @click.capture="closeImmediately"
    @pointerenter="open"
    @pointerleave="close"
    @focusin="open"
    @focusout="close"
  >
    <slot />
  </div>

  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed z-[90] hidden w-80 overflow-hidden rounded-lg border border-white/10 bg-[#303047]/85 p-3 text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition duration-150 ease-out md:block"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
      @pointerenter="keepOpen"
      @pointerleave="close"
    >
      <div v-if="isLoading && !details" class="flex h-64 items-center justify-center text-pink-300">
        <div class="text-4xl" i-eos-icons:three-dots-loading />
      </div>

      <template v-else-if="details">
        <div class="flex gap-3">
          <NRemoteImage
            v-if="image"
            :src="image"
            :alt="title"
            :placeholder-color="details.coverImage?.color"
            class="h-24 w-16 shrink-0 rounded object-cover"
            loading="lazy"
          />

          <div class="min-w-0 flex-1">
            <NTitleTransition
              as="h2"
              :text="title"
              :transition-key="selectedLanguage"
              class="line-clamp-2 text-lg font-extrabold leading-tight"
            />

            <div class="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span v-if="details.averageScore" class="inline-flex items-center gap-1 text-[var(--color-heading)]/90">
                <div i-material-symbols-star-rounded class="text-base text-yellow-300" />
                {{ (details.averageScore / 10).toFixed(1) }}
              </span>
              <span class="rounded bg-green-200 px-1.5 py-0.5 font-bold text-black">CC</span>
              <span v-if="details.episodes" class="rounded bg-cyan-200 px-1.5 py-0.5 font-bold text-black">{{
                details.episodes
              }}</span>
              <span
                v-if="!props.hideFormatAndGenres"
                class="ml-auto rounded bg-yellow-200 px-2 py-0.5 font-bold text-black"
              >
                {{ formatText(details.format) }}
              </span>
            </div>
          </div>
        </div>

        <p v-if="cleanDescription" class="mt-4 line-clamp-3 text-sm leading-6 text-white/72">
          {{ cleanDescription }}
        </p>

        <dl class="mt-4 space-y-1 text-sm leading-6 text-white/78">
          <div v-if="otherNames">
            <dt class="inline text-white/55">Other names:</dt>
            <dd class="inline">{{ otherNames }}</dd>
          </div>
          <div>
            <dt class="inline text-white/55">Aired:</dt>
            <dd class="inline">
              {{
                details.season
                  ? `${formatText(details.season)} ${details.seasonYear || ''}`
                  : details.seasonYear || 'TBA'
              }}
            </dd>
          </div>
          <div>
            <dt class="inline text-white/55">Status:</dt>
            <dd class="inline">{{ formatText(details.status) }}</dd>
          </div>
          <div v-if="!props.hideFormatAndGenres && details.genres?.length">
            <dt class="inline text-white/55">Genre:</dt>
            <dd class="inline">{{ details.genres.slice(0, 6).join(', ') }}</dd>
          </div>
          <div v-if="studios">
            <dt class="inline text-white/55">Studios:</dt>
            <dd class="inline">{{ studios }}</dd>
          </div>
          <div>
            <dt class="inline text-white/55">Duration:</dt>
            <dd class="inline">{{ details.duration ? `${details.duration} min` : 'TBA' }}</dd>
          </div>
        </dl>

        <div class="mt-5 flex items-center gap-3">
          <NuxtLink
            :to="`/watch/${details.id}?episode=1&language=sub`"
            class="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-pink-300 px-4 font-extrabold text-black no-underline transition hover:opacity-85"
          >
            <div i-material-symbols-play-arrow-rounded class="text-xl" />
            <span>Watch now</span>
          </NuxtLink>

          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 text-black transition hover:bg-pink-300"
            :class="isSaved ? 'bg-pink-300' : 'bg-white'"
            :aria-label="isSaved ? 'Remove from watchlist' : 'Add to watchlist'"
            @click.prevent="toggleSaved"
          >
            <div v-if="isSaved" i-material-symbols-check-rounded class="text-2xl" />
            <div v-else i-material-symbols-add-rounded class="text-2xl" />
          </button>
        </div>
      </template>
    </div>
  </Teleport>
</template>
