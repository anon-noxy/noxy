<script setup lang="ts">
const userPreferences = useUserPreferencesStore()
const { toasts } = storeToRefs(userPreferences)

const toastClass = (tone: string) => {
  if (tone === 'success') {
    return 'border-green-300/25 bg-green-300/12'
  }

  if (tone === 'error') {
    return 'border-red-300/25 bg-red-300/12'
  }

  return 'border-pink-300/25 bg-pink-300/12'
}
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      tag="div"
      name="toast"
      class="fixed bottom-4 left-4 right-4 z-[120] flex flex-col gap-3 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="flex items-center gap-3 rounded-lg border px-4 py-3 text-white shadow-2xl shadow-black/30 backdrop-blur-xl"
        :class="toastClass(toast.tone)"
        role="status"
      >
        <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-pink-300">
          <div v-if="toast.tone === 'success'" i-material-symbols-check-rounded class="text-xl" />
          <div v-else-if="toast.tone === 'error'" i-material-symbols-warning-rounded class="text-xl" />
          <div v-else i-material-symbols-bookmark-rounded class="text-xl" />
        </span>

        <p class="min-w-0 flex-1 text-sm font-semibold leading-5">
          {{ toast.message }}
        </p>

        <button
          type="button"
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Close notification"
          @click="userPreferences.removeToast(toast.id)"
        >
          <div i-material-symbols-close-rounded class="text-xl" />
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.toast-move {
  transition: transform 180ms ease;
}
</style>
