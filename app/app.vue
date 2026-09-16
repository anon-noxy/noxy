<script setup lang="ts">
const DEBUGGER_PAUSE_THRESHOLD_MS = 120
const DEVTOOLS_CHECK_INTERVAL_MS = 750
const DEVTOOLS_OPEN_CONFIRM_DELAY_MS = 300
const INSPECT_CONTEXT_INTENT_MS = 5000
const VIEWPORT_CHANGE_GRACE_MS = 1000
const INDEX_PATH = '/'
const INSPECT_SHORTCUT_KEYS = new Set(['c', 'i', 'j', 'k'])

const userPreferences = useUserPreferencesStore()
const { selectedLanguage } = storeToRefs(userPreferences)
const { startWatchlistSync } = useSupabaseWatchlistSync()
const router = useRouter()
useNoxyLoadingIndicator()

const toggleLanguage = (language: string) => {
  userPreferences.setLanguage(language)
}

provide('selectedLanguage', selectedLanguage)
provide('toggleLanguage', toggleLanguage)

const isInspectShortcut = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()
  const hasInspectModifier = (event.ctrlKey && event.shiftKey) || (event.metaKey && (event.altKey || event.shiftKey))

  return event.key === 'F12' || (hasInspectModifier && INSPECT_SHORTCUT_KEYS.has(key))
}

const getViewportSnapshot = () => [
  window.innerWidth,
  window.innerHeight,
  window.outerWidth,
  window.outerHeight,
  window.devicePixelRatio,
]

const isSameViewport = (first: number[], second: number[]) => {
  return first.every((value, index) => value === second[index])
}

const didDebuggerPause = () => {
  try {
    const viewportBefore = getViewportSnapshot()
    const startedAt = performance.now()
    const runAnonymousDebugger = Function('debugger') as () => void

    runAnonymousDebugger()

    return (
      performance.now() - startedAt > DEBUGGER_PAUSE_THRESHOLD_MS &&
      isSameViewport(viewportBefore, getViewportSnapshot())
    )
  } catch {
    return false
  }
}

const startDevtoolsDebuggerGuard = () => {
  if (import.meta.test) {
    return
  }

  let lastViewportChangeAt = performance.now()
  let devtoolsWasOpen = false
  let pendingDevtoolsStateId: number | undefined
  let pendingDevtoolsCloseCheckId: number | undefined
  let inspectContextIntentId: number | undefined
  let hasInspectContextIntent = false

  const redirectIndex = () => {
    const alreadyOnIndex = window.location.pathname === INDEX_PATH && !window.location.search && !window.location.hash

    if (alreadyOnIndex) {
      return
    }

    void router.replace(INDEX_PATH)
  }

  const cancelPendingDevtoolsState = () => {
    if (pendingDevtoolsStateId === undefined) return

    window.clearTimeout(pendingDevtoolsStateId)
    pendingDevtoolsStateId = undefined
  }

  const cancelPendingDevtoolsCloseCheck = () => {
    if (pendingDevtoolsCloseCheckId === undefined) return

    window.clearTimeout(pendingDevtoolsCloseCheckId)
    pendingDevtoolsCloseCheckId = undefined
  }

  const viewportRecentlyChanged = () => {
    return performance.now() - lastViewportChangeAt < VIEWPORT_CHANGE_GRACE_MS
  }

  const clearInspectContextIntent = () => {
    hasInspectContextIntent = false

    if (inspectContextIntentId === undefined) return

    window.clearTimeout(inspectContextIntentId)
    inspectContextIntentId = undefined
  }

  const handleContextMenu = () => {
    clearInspectContextIntent()
    hasInspectContextIntent = true
    inspectContextIntentId = window.setTimeout(clearInspectContextIntent, INSPECT_CONTEXT_INTENT_MS)
  }

  const confirmDevtoolsOpen = () => {
    const suspectedViewport = getViewportSnapshot()

    cancelPendingDevtoolsState()
    pendingDevtoolsStateId = window.setTimeout(() => {
      pendingDevtoolsStateId = undefined

      if (viewportRecentlyChanged() || !isSameViewport(suspectedViewport, getViewportSnapshot())) return

      devtoolsWasOpen = true
    }, DEVTOOLS_OPEN_CONFIRM_DELAY_MS)
  }

  function checkDevtoolsState(ignoreViewportGrace = false) {
    if (!ignoreViewportGrace && viewportRecentlyChanged()) return

    if (didDebuggerPause()) {
      cancelPendingDevtoolsCloseCheck()

      if (hasInspectContextIntent) {
        clearInspectContextIntent()
        devtoolsWasOpen = true
        cancelPendingDevtoolsState()
      } else if (devtoolsWasOpen) {
        cancelPendingDevtoolsState()
      } else {
        confirmDevtoolsOpen()
      }

      return
    }

    if (devtoolsWasOpen) {
      devtoolsWasOpen = false
      cancelPendingDevtoolsState()
      redirectIndex()
    } else {
      cancelPendingDevtoolsState()
    }
  }

  const checkForDevtoolsClose = () => {
    if (!devtoolsWasOpen) return

    cancelPendingDevtoolsCloseCheck()
    pendingDevtoolsCloseCheckId = window.setTimeout(() => {
      pendingDevtoolsCloseCheckId = undefined
      checkDevtoolsState(true)
    }, 0)
  }

  const handleViewportChange = () => {
    lastViewportChangeAt = performance.now()
    cancelPendingDevtoolsState()
    checkForDevtoolsClose()
  }

  const handleWindowFocus = () => {
    checkForDevtoolsClose()
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (isInspectShortcut(event)) {
      devtoolsWasOpen = true
      cancelPendingDevtoolsState()
    }
  }

  const cleanup = () => {
    window.clearInterval(checkIntervalId)
    cancelPendingDevtoolsState()
    cancelPendingDevtoolsCloseCheck()
    clearInspectContextIntent()
    window.removeEventListener('keydown', handleKeydown, true)
    window.removeEventListener('contextmenu', handleContextMenu, true)
    window.removeEventListener('focus', handleWindowFocus)
    window.removeEventListener('resize', handleViewportChange)
    window.visualViewport?.removeEventListener('resize', handleViewportChange)
    window.removeEventListener('pagehide', cleanup)
  }

  const checkIntervalId = window.setInterval(checkDevtoolsState, DEVTOOLS_CHECK_INTERVAL_MS)

  window.addEventListener('keydown', handleKeydown, true)
  window.addEventListener('contextmenu', handleContextMenu, true)
  window.addEventListener('focus', handleWindowFocus)
  window.addEventListener('resize', handleViewportChange)
  window.visualViewport?.addEventListener('resize', handleViewportChange)
  window.addEventListener('pagehide', cleanup, { once: true })
}

onMounted(() => {
  userPreferences.hydrate()
  startWatchlistSync()
  startDevtoolsDebuggerGuard()
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtAnnouncer />
  <NuxtLoadingIndicator color="#f9a8d4" :height="3" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <NAuthModal />
    <NToastHost />
  </ClientOnly>
</template>
