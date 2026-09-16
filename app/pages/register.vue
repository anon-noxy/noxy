<script setup lang="ts">
const route = useRoute()
const redirect = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
const query: Record<string, string> = {
  auth: 'register',
}

if (typeof redirect === 'string') {
  query.redirect = redirect
}

await navigateTo(
  {
    path: '/home',
    query,
  },
  {
    replace: true,
    redirectCode: 302,
  },
)
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)]" />
</template>
