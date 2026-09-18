// https://nuxt.com/docs/api/configuration/nuxt-config
const deploymentUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://noxy-rho.vercel.app'
const siteUrl = deploymentUrl.replace(/\/$/, '')
const siteTitle = 'Noxy - Watch Anime'
const siteDescription =
  'Browse anime, discover trending titles, manage a local watchlist, and continue watching with Noxy.'
const ogImageUrl = `${siteUrl}/og-image.png`
const productionRouteRules =
  process.env.NODE_ENV === 'production'
    ? {
        // These routes only render public anime metadata. ISR moves repeat page
        // and API reads to Vercel's CDN, so a cache hit does not wake a Fluid
        // function. Keep account, profile, watchlist, settings, and player
        // routes dynamic.
        '/': { isr: 10 * 60 },
        '/home': { isr: 10 * 60 },
        '/news': { isr: 10 * 60 },
        '/anime/**': { isr: 60 },
        '/az/**': { isr: 15 * 60 },
        '/category/**': { isr: 15 * 60 },
        '/genre/**': { isr: 15 * 60 },
        '/contact': { prerender: true },
        '/dmca': { prerender: true },
        '/terms-of-service': { prerender: true },

        '/api/news': { isr: 10 * 60 },
        '/api/myanimelist/az': { isr: 15 * 60 },
        '/api/myanimelist/catalog': { isr: 15 * 60 },
        '/api/myanimelist/filter': { isr: 10 * 60 },
        '/api/myanimelist/home-discover': { isr: 10 * 60 },
        '/api/myanimelist/home-lists': { isr: 30 * 60 },
        '/api/myanimelist/schedule': { isr: 10 * 60 },
        '/api/myanimelist/search': { isr: 5 * 60 },
        '/api/myanimelist/spotlight': { isr: 10 * 60 },
        '/api/myanimelist/trending': { isr: 30 * 60 },
        '/api/myanimelist/genre/**': { isr: 15 * 60 },
        '/api/myanimelist/hover/**': { isr: 5 * 60 },
        '/api/myanimelist/**': { isr: 60 },
      }
    : {}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' },
  routeRules: productionRouteRules,
  modules: [
    '@nuxt/image',
    '@unocss/nuxt',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@vercel/speed-insights/nuxt',
    '@vercel/analytics',
  ],
  css: ['@/assets/css/global.css'],
  app: {
    head: {
      title: 'Noxy - Watch Anime',
      titleTemplate: '%s',
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        {
          name: 'description',
          content: siteDescription,
        },
        { name: 'color-scheme', content: 'dark' },
        { name: 'theme-color', content: '#1e1e2e' },
        { property: 'og:site_name', content: 'Noxy' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: siteUrl },
        { property: 'og:title', content: siteTitle },
        {
          property: 'og:description',
          content: siteDescription,
        },
        { property: 'og:image', content: ogImageUrl },
        { property: 'og:image:secure_url', content: ogImageUrl },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Noxy - Watch Anime' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: siteTitle },
        { name: 'twitter:description', content: siteDescription },
        { name: 'twitter:image', content: ogImageUrl },
        { name: 'twitter:image:alt', content: 'Noxy - Watch Anime' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico?v=3', sizes: 'any' },
        { rel: 'shortcut icon', href: '/favicon.ico?v=3' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png?v=3' },
        { rel: 'preconnect', href: 'https://cdn.myanimelist.net', crossorigin: '' },
      ],
    },
  },
  nitro: {
    compressPublicAssets: true,
  },
  image: {
    provider: 'none',
  },
  runtimeConfig: {
    malApiBaseUrl: process.env.MAL_API_BASE_URL || 'https://api.myanimelist.net/v2',
    animeNewsApiBaseUrl: process.env.ANIME_NEWS_API_BASE_URL || 'https://aninews.vercel.app',
    malClientId: process.env.MAL_CLIENT_ID || '',
    malClientSecret: process.env.MAL_CLIENT_SECRET || '',
    malMaxConcurrentRequests: process.env.MAL_MAX_CONCURRENT_REQUESTS || '8',
    apiMaxConcurrentRequests: process.env.NOXY_API_MAX_CONCURRENT_REQUESTS || '80',
    apiRateLimitMultiplier: process.env.NOXY_API_RATE_LIMIT_MULTIPLIER || '1',
    nonCriticalLoadShedThreshold: process.env.NOXY_NON_CRITICAL_LOAD_SHED_THRESHOLD || '0.75',
    disableNonCriticalFeatures: process.env.NOXY_DISABLE_NON_CRITICAL_FEATURES || 'false',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
      supabaseEmailRedirectTo: process.env.NUXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO || '',
    },
  },
})
