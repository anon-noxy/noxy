<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

type ImageLoading = 'eager' | 'lazy'
type ImageFetchPriority = 'auto' | 'high' | 'low'
type ImageRef = HTMLImageElement | { imgEl?: HTMLImageElement | null; $el?: Element } | null

const props = defineProps<{
  src?: string
  fallbackSrc?: string
  alt?: string
  placeholderColor?: string
  width?: string | number
  height?: string | number
  loading?: ImageLoading
  fetchpriority?: ImageFetchPriority
}>()

const attrs = useAttrs()
const slots = useSlots()
const didPrimarySourceFail = ref(false)
const didFallbackSourceFail = ref(false)
const isLoaded = ref(false)
const imageRef = ref<ImageRef>(null)

const normalizedSrc = computed(() => props.src?.trim() || '')
const normalizedFallbackSrc = computed(() => {
  const fallbackSrc = props.fallbackSrc?.trim() || ''

  return fallbackSrc === normalizedSrc.value ? '' : fallbackSrc
})
const activeSrc = computed(() => {
  if (normalizedSrc.value && !didPrimarySourceFail.value) {
    return normalizedSrc.value
  }

  if (normalizedFallbackSrc.value && !didFallbackSourceFail.value) {
    return normalizedFallbackSrc.value
  }

  return ''
})
const normalizedPlaceholderColor = computed(() => {
  const value = props.placeholderColor?.trim()

  if (!value) {
    return ''
  }

  const isSafeColor =
    /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ||
    /^rgba?\([\d\s,.%]+\)$/i.test(value) ||
    /^hsla?\([\d\s,.%]+\)$/i.test(value) ||
    /^var\(--[\w-]+\)$/i.test(value)

  return isSafeColor ? value : ''
})
const fallbackStyle = computed(() => ({
  '--n-remote-image-placeholder-color': normalizedPlaceholderColor.value || 'var(--color-background-soft)',
}))
const hasFallbackSlot = computed(() => Boolean(slots.fallback))
const fallbackAriaLabel = computed(() => (!hasFallbackSlot.value && props.alt ? props.alt : undefined))
const fallbackAriaHidden = computed(() => (!hasFallbackSlot.value && !props.alt ? 'true' : undefined))
const fallbackRole = computed(() => (!hasFallbackSlot.value && props.alt ? 'img' : undefined))

watch([normalizedSrc, normalizedFallbackSrc], () => {
  didPrimarySourceFail.value = false
  didFallbackSourceFail.value = false
  isLoaded.value = false
  void markAlreadyLoadedImage()
})

watch(activeSrc, () => {
  isLoaded.value = false
  void markAlreadyLoadedImage()
})

const markImageLoaded = () => {
  isLoaded.value = true
}

const markSourceImageFailed = () => {
  if (activeSrc.value === normalizedSrc.value) {
    didPrimarySourceFail.value = true
  } else {
    didFallbackSourceFail.value = true
  }

  isLoaded.value = false
}

const getImageElement = () => {
  const image = imageRef.value

  if (!image || typeof HTMLImageElement === 'undefined') {
    return null
  }

  if (image instanceof HTMLImageElement) {
    return image
  }

  if (image.imgEl instanceof HTMLImageElement) {
    return image.imgEl
  }

  return image.$el instanceof HTMLImageElement ? image.$el : null
}

const markAlreadyLoadedImage = async () => {
  await nextTick()

  const image = getImageElement()

  if (image?.complete && image.naturalWidth > 0) {
    markImageLoaded()
  }
}

onMounted(() => {
  void markAlreadyLoadedImage()
})
</script>

<template>
  <NuxtImg
    v-if="activeSrc"
    ref="imageRef"
    v-bind="attrs"
    provider="none"
    :src="activeSrc"
    :alt="alt || ''"
    :width="width"
    :height="height"
    :loading="loading"
    :fetchpriority="fetchpriority"
    decoding="async"
    class="n-remote-image"
    :class="isLoaded ? 'n-remote-image--loaded' : 'n-remote-image--loading'"
    @load="markImageLoaded"
    @error="markSourceImageFailed"
  />

  <div
    v-else
    v-bind="attrs"
    class="n-remote-image-fallback"
    :style="fallbackStyle"
    :role="fallbackRole"
    :aria-label="fallbackAriaLabel"
    :aria-hidden="fallbackAriaHidden"
  >
    <slot
      name="fallback"
      :src="normalizedSrc"
      :fallback-src="normalizedFallbackSrc"
      :alt="alt || ''"
      :failed="Boolean(normalizedSrc || normalizedFallbackSrc)"
      :placeholder-color="normalizedPlaceholderColor"
    >
      <div class="n-remote-image-fallback__content" aria-hidden="true">
        <div i-material-symbols-image-not-supported-outline class="text-2xl" />
      </div>
    </slot>
  </div>
</template>

<style scoped>
.n-remote-image-fallback {
  display: grid;
  overflow: hidden;
  place-items: center;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 10%), rgb(0 0 0 / 30%)),
    var(--n-remote-image-placeholder-color, var(--color-background-soft));
}

.n-remote-image-fallback__content {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 2.25rem;
  place-items: center;
  color: rgb(255 255 255 / 68%);
  background: rgb(0 0 0 / 14%);
}

.n-remote-image--loading {
  opacity: 0;
}

.n-remote-image--loaded {
  animation: n-remote-image-fade-in 180ms ease-out both;
}

@keyframes n-remote-image-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>
