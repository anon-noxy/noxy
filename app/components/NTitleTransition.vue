<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

type Props = {
  as?: string
  text?: string
  title?: string
  transitionKey?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  as: 'span',
  text: '',
  title: '',
  transitionKey: '',
})

const attrs = useAttrs()
const forwardedAttrs = computed(() => {
  const { class: _class, title: _title, ...rest } = attrs

  return rest
})
const titleText = computed(() => props.title || (typeof attrs.title === 'string' ? attrs.title : undefined))
const displayKey = computed(() => String(props.transitionKey || props.text))
</script>

<template>
  <Transition name="title-swap" mode="out-in">
    <component :is="as" :key="displayKey" v-bind="forwardedAttrs" :class="attrs.class" :title="titleText">
      <slot>{{ text }}</slot>
    </component>
  </Transition>
</template>

<style scoped>
.title-swap-enter-active,
.title-swap-leave-active {
  transition: opacity 1s ease;
}

.title-swap-enter-from,
.title-swap-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .title-swap-enter-active,
  .title-swap-leave-active {
    transition-duration: 1ms;
  }
}
</style>
