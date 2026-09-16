<script setup lang="ts">
const route = useRoute()
const redirect = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
const verified = Array.isArray(route.query.verified) ? route.query.verified[0] : route.query.verified
const query: Record<string, string> = {
  auth: 'login',
}

if (typeof redirect === 'string') {
  query.redirect = redirect
}

if (verified === '1') {
  query.verified = '1'
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
