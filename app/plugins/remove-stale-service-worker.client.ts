export default defineNuxtPlugin(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined)
  }

  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('noxy-')).map((key) => caches.delete(key))))
      .catch(() => undefined)
  }
})
