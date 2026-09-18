<script setup lang="ts" generic="T extends { id: number | string }">
import { useVirtualizer } from '@tanstack/vue-virtual'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    items: T[]
    minColumnWidth?: number
    maxColumns?: number
    estimatedItemHeight?: number
    gap?: number
    virtualizeAt?: number
  }>(),
  {
    minColumnWidth: 140,
    maxColumns: 6,
    estimatedItemHeight: 380,
    gap: 16,
    virtualizeAt: 100,
  },
)

defineSlots<{
  default(props: { item: T | undefined; index: number }): unknown
}>()

const scrollElement = ref<HTMLElement | null>(null)
const normalGridElement = ref<HTMLElement | null>(null)
const gridWidth = ref(0)

const columnCount = computed(() => {
  if (!gridWidth.value) return 1

  return Math.min(
    props.maxColumns,
    Math.max(1, Math.floor((gridWidth.value + props.gap) / (props.minColumnWidth + props.gap))),
  )
})
const itemWidth = computed(() => {
  return Math.max((gridWidth.value - props.gap * (columnCount.value - 1)) / columnCount.value, 0)
})
const shouldVirtualize = computed(() => props.items.length > props.virtualizeAt)

const virtualizer = useVirtualizer(
  computed(() => ({
    count: props.items.length,
    getScrollElement: () => scrollElement.value,
    estimateSize: () => props.estimatedItemHeight,
    lanes: columnCount.value,
    overscan: 6,
  })),
)

const updateGridWidth = ([entry]: ResizeObserverEntry[]) => {
  gridWidth.value = entry?.contentRect.width || 0
}

useResizeObserver(scrollElement, updateGridWidth)
useResizeObserver(normalGridElement, updateGridWidth)

watch(
  () => [props.items, columnCount.value],
  () => {
    virtualizer.value.measure()
  },
)

const measureItem = (value: Element | ComponentPublicInstance | null) => {
  if (value instanceof Element) {
    virtualizer.value.measureElement(value)
  }
}

const getVirtualItemStyle = (index: number, lane: number, start: number) => ({
  position: 'absolute' as const,
  top: '0',
  left: `${lane * (itemWidth.value + props.gap)}px`,
  width: `${itemWidth.value}px`,
  transform: `translateY(${start}px)`,
})
</script>

<template>
  <div
    v-if="!shouldVirtualize"
    ref="normalGridElement"
    class="grid"
    v-bind="$attrs"
    :style="{
      gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
      gap: `${gap}px`,
    }"
  >
    <slot v-for="(item, index) in items" :item="item" :index="index" />
  </div>

  <div
    v-else
    ref="scrollElement"
    class="max-h-[75vh] overflow-y-auto overscroll-contain"
    v-bind="$attrs"
    aria-label="Anime results"
    role="grid"
  >
    <div class="relative w-full" :style="{ height: `${virtualizer.getTotalSize()}px` }">
      <div
        v-for="virtualItem in virtualizer.getVirtualItems()"
        :key="items[virtualItem.index]?.id"
        :ref="measureItem"
        role="gridcell"
        :style="getVirtualItemStyle(virtualItem.index, virtualItem.lane, virtualItem.start)"
      >
        <slot :item="items[virtualItem.index]" :index="virtualItem.index" />
      </div>
    </div>
  </div>
</template>
