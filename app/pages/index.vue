<script setup lang="ts">
type SpotlightAnime = {
  id: number
  title: string
  japaneseTitle: string
  banner: string
  image: string
  type: string
  genres: string[]
  releaseDate: string
  quality: string
  sub: number
  dub: number
}

definePageMeta({
  layout: 'base',
})

const searchQuery = ref('')
const indexSearchInput = ref<HTMLInputElement | null>(null)
const currentYear = new Date().getFullYear()
const discordInviteUrl = 'https://discord.gg/Nsx8WNNCk'

const { data: spotlightData, pending: spotlightPending } = await useFetch<SpotlightAnime[]>(
  '/api/myanimelist/spotlight',
  {
    default: () => [],
    lazy: true,
  },
)

const featuredAnime = computed(() => {
  return (
    spotlightData.value?.find((anime) => anime.banner) ||
    spotlightData.value?.find((anime) => anime.image) ||
    spotlightData.value?.[0]
  )
})

const heroArtwork = computed(() => {
  return featuredAnime.value?.banner || featuredAnime.value?.image || ''
})

const topSearches = computed(() => {
  return (spotlightData.value || []).slice(0, 10)
})

const trendingAnime = computed(() => {
  const entries = spotlightData.value || []
  const alternateEntries = entries.filter((anime) => anime.id !== featuredAnime.value?.id)

  return (alternateEntries.length ? alternateEntries : entries).slice(0, 3)
})

const isIndexPageLoading = computed(() => spotlightPending.value && !spotlightData.value?.length)

const searchTo = computed(() => {
  const query = searchQuery.value.trim()

  return query ? `/filter?search=${encodeURIComponent(query)}` : '/filter'
})

const clearIndexSearch = async () => {
  searchQuery.value = ''
  await nextTick()
  indexSearchInput.value?.focus()
}

useSeoMeta({
  title: 'Noxy - Watch Anime',
  description: 'Anime search, seasonal releases, popular titles, and direct watch routes in one focused catalog.',
})
</script>

<template>
  <main class="index-page min-h-screen overflow-hidden">
    <nav
      class="top-navigation mx-auto flex w-full max-w-[1380px] flex-wrap items-center justify-center gap-x-5 gap-y-3 px-4 pb-7 pt-9 sm:flex-nowrap sm:gap-10 sm:px-8 sm:pt-14"
      aria-label="Index navigation"
    >
      <NuxtLink to="/home" class="top-link">Home</NuxtLink>
      <NuxtLink to="/category/movie" class="top-link">Movies</NuxtLink>
      <NuxtLink to="/filter?type=TV" class="top-link">TV Series</NuxtLink>
      <NuxtLink to="/category/most-popular" class="top-link">Most Popular</NuxtLink>
      <NuxtLink to="/category/top-upcoming" class="top-link">Top Upcoming</NuxtLink>
    </nav>

    <template v-if="isIndexPageLoading">
      <section class="mx-auto w-full max-w-[1380px] px-5 sm:px-8">
        <div class="hero-shell min-h-[540px] animate-pulse rounded-[2.4rem] p-8 sm:p-12 lg:p-20">
          <div class="h-16 w-44 rounded-xl bg-[var(--ctp-surface1)]" />
          <div class="mt-8 h-14 max-w-xl rounded-xl bg-[var(--ctp-surface1)]" />
          <div class="mt-8 grid max-w-xl gap-2">
            <div class="h-4 w-full rounded bg-[var(--ctp-surface1)]" />
            <div class="h-4 w-5/6 rounded bg-[var(--ctp-surface1)]" />
            <div class="h-4 w-4/6 rounded bg-[var(--ctp-surface1)]" />
          </div>
          <div class="mt-10 h-14 w-64 rounded-xl bg-[var(--ctp-pink)]/35" />
        </div>
      </section>

      <section
        class="mx-auto grid w-full max-w-[1220px] animate-pulse gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px]"
      >
        <div class="space-y-6">
          <div class="h-16 rounded-xl bg-[var(--ctp-surface0)]" />
          <div class="h-8 w-64 rounded bg-[var(--ctp-surface0)]" />
          <div class="h-20 rounded-xl bg-[var(--ctp-surface0)]" />
        </div>
        <div class="space-y-4">
          <div class="h-8 w-52 rounded bg-[var(--ctp-surface0)]" />
          <div v-for="entry in 2" :key="entry" class="h-36 rounded-2xl bg-[var(--ctp-surface0)]" />
        </div>
      </section>
    </template>

    <template v-else>
      <section class="mx-auto w-full max-w-[1380px] px-5 sm:px-8">
        <div class="hero-shell relative min-h-[540px] overflow-hidden rounded-[2.4rem]">
          <NRemoteImage
            v-if="heroArtwork"
            :src="heroArtwork"
            :alt="featuredAnime?.title || 'Seasonal anime'"
            class="hero-artwork absolute inset-y-0 right-0 h-full w-full object-cover lg:w-[58%]"
            loading="eager"
            fetchpriority="high"
          />
          <div
            v-else
            class="absolute inset-y-0 right-0 w-full bg-[linear-gradient(135deg,var(--ctp-surface1),var(--ctp-mantle))] lg:w-[58%]"
          />
          <div class="hero-artwork-overlay absolute inset-0" />

          <div
            class="relative z-10 flex min-h-[540px] max-w-[720px] flex-col justify-center px-7 py-12 sm:px-12 lg:px-20"
          >
            <NRemoteImage
              src="/images/logo.svg"
              alt="Noxy"
              class="h-18 w-fit max-w-52 object-contain sm:h-20 sm:max-w-60"
              draggable="false"
            />

            <form class="index-search-form mt-8 max-w-[590px]" role="search" @submit.prevent="navigateTo(searchTo)">
              <label for="index-search" class="sr-only">Anime title search</label>
              <div class="index-search-shell group flex h-14 items-center gap-2 rounded-2xl p-1.5 sm:h-15">
                <div class="index-search-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                  <span class="i-material-symbols-search-rounded text-xl" />
                </div>

                <input
                  id="index-search"
                  ref="indexSearchInput"
                  v-model="searchQuery"
                  type="search"
                  placeholder="Search anime titles..."
                  class="index-search-input min-w-0 flex-1 appearance-none border-0 bg-transparent px-1 py-0 text-sm font-semibold shadow-none outline-none ring-0 sm:text-base"
                  autocomplete="off"
                  spellcheck="false"
                />

                <button
                  v-if="searchQuery"
                  type="button"
                  class="index-search-clear grid h-8 w-8 shrink-0 place-items-center rounded-lg border-0 bg-transparent p-0"
                  aria-label="Clear index search"
                  @click="clearIndexSearch"
                >
                  <span class="i-material-symbols-close-rounded text-lg" />
                </button>

                <span class="h-7 w-px shrink-0 bg-white/10" aria-hidden="true" />

                <button
                  type="submit"
                  class="index-filter-button inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border-0 px-3 font-lexend text-xs font-black sm:px-4 sm:text-sm"
                  aria-label="Open anime filters"
                  title="Search and open advanced anime filters"
                >
                  <span class="i-material-symbols-tune-rounded text-lg" />
                  <span>Filters</span>
                </button>
              </div>

              <p class="mt-2.5 flex items-center gap-1.5 px-2 text-[10px] font-bold text-[var(--ctp-overlay1)]">
                <span class="i-material-symbols-info-outline-rounded text-sm text-[var(--ctp-pink)]" />
                Search by title, then refine by type, status, season, or genre.
              </p>
            </form>

            <div v-if="topSearches.length" class="mt-7 max-w-[560px] text-[13px] leading-6 text-[var(--ctp-text)]">
              <span class="mr-2 font-bold text-[var(--ctp-text)]">Top search:</span>
              <NuxtLink
                v-for="anime in topSearches"
                :key="anime.id"
                :to="`/anime/${anime.id}`"
                class="top-search-link mr-2 inline-block max-w-44 truncate align-bottom no-underline"
              >
                {{ anime.title }}
              </NuxtLink>
            </div>

            <NuxtLink
              to="/home"
              class="watch-button group mt-10 inline-flex h-15 w-fit min-w-64 items-center justify-center gap-6 rounded-xl px-8 text-lg font-black no-underline"
            >
              <span>Watch anime</span>
              <span
                class="grid h-6 w-6 place-items-center rounded-full bg-[var(--ctp-crust)] text-[var(--ctp-pink)] transition group-hover:translate-x-0.5"
              >
                <span class="i-material-symbols-arrow-forward-rounded text-base" />
              </span>
            </NuxtLink>
          </div>
        </div>
      </section>

      <section
        class="mx-auto grid w-full max-w-[1220px] items-start gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-12"
      >
        <div class="min-w-0">
          <div class="community-banner rounded-lg px-4 py-2.5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
              <p class="text-[13px] leading-5 text-[var(--ctp-text)] sm:text-sm">
                <span class="font-black text-[var(--ctp-pink)]">Noxy is Live!</span>
                Account access,
                <strong class="font-black text-[var(--ctp-text)]">watchlists, and saved data</strong>
                remain available. Log in and continue watching favorite anime from the latest saved point!
              </p>
              <NuxtLink
                :to="discordInviteUrl"
                external
                class="discord-button inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-full px-4 text-xs font-black text-white no-underline sm:self-auto"
              >
                <span class="i-ic-baseline-discord text-base" />
                <span>Join Discord</span>
              </NuxtLink>
            </div>
          </div>

          <div class="mt-5">
            <p class="text-xs font-black text-[var(--ctp-pink)]">Share Noxy</p>
            <p class="mt-0.5 text-[11px] text-[var(--ctp-subtext0)]">with anime fans</p>
          </div>

          <article class="mt-10">
            <h1 class="max-w-3xl text-2xl font-black leading-snug text-[var(--ctp-heading)] sm:text-3xl">
              Noxy – Watch Anime Online with a Faster Browsing Experience
            </h1>

            <p class="mt-5 text-sm leading-7 text-[var(--ctp-subtext0)]">
              Noxy brings anime search, seasonal discovery, title details, and direct watch routes into a fast,
              responsive catalog. Subbed and dubbed labels keep episode availability clear across desktop and mobile
              screens.
            </p>

            <div class="mt-7 grid gap-3 sm:grid-cols-3">
              <section class="info-card rounded-xl p-4">
                <span class="i-material-symbols-search-rounded text-xl text-[var(--ctp-pink)]" />
                <h2 class="mt-3 text-sm font-black text-[var(--ctp-heading)]">Quick search</h2>
                <p class="mt-2 text-xs leading-5 text-[var(--ctp-subtext0)]">
                  Title, genre, season, and format filters.
                </p>
              </section>
              <section class="info-card rounded-xl p-4">
                <span class="i-material-symbols-update-rounded text-xl text-[var(--ctp-blue)]" />
                <h2 class="mt-3 text-sm font-black text-[var(--ctp-heading)]">Fresh listings</h2>
                <p class="mt-2 text-xs leading-5 text-[var(--ctp-subtext0)]">
                  Current releases and recently added episodes.
                </p>
              </section>
              <section class="info-card rounded-xl p-4">
                <span class="i-material-symbols-devices-rounded text-xl text-[var(--ctp-green)]" />
                <h2 class="mt-3 text-sm font-black text-[var(--ctp-heading)]">Flexible layout</h2>
                <p class="mt-2 text-xs leading-5 text-[var(--ctp-subtext0)]">
                  Responsive browsing across common screen sizes.
                </p>
              </section>
            </div>
          </article>
        </div>

        <aside>
          <h2 class="text-2xl font-black text-[var(--ctp-heading)]">Trending Titles</h2>

          <div class="mt-6 space-y-4">
            <NuxtLink
              v-for="(anime, index) in trendingAnime"
              :key="anime.id"
              :to="`/anime/${anime.id}`"
              class="trending-card group block rounded-2xl p-5 no-underline"
            >
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 text-[9px]">
                  <span class="font-black text-[var(--ctp-pink)]">#Trending</span>
                  <span class="text-[var(--ctp-overlay1)]">Now airing</span>
                </div>
                <span class="inline-flex items-center gap-1 text-[10px] text-[var(--ctp-subtext0)]">
                  <span class="i-material-symbols-visibility-rounded text-sm" />
                  <span>0{{ index + 1 }}</span>
                </span>
              </div>

              <h3 class="mt-4 line-clamp-2 text-base font-bold leading-snug text-[var(--ctp-heading)]">
                {{ anime.title }}
              </h3>
              <p class="mt-2 line-clamp-2 text-xs leading-5 text-[var(--ctp-subtext0)]">
                Current-season release with active episode availability, catalog details, and score data.
              </p>

              <div class="mt-4 flex flex-wrap gap-2">
                <span v-if="anime.quality" class="meta-pill">{{ anime.quality }}</span>
                <span v-if="anime.type" class="meta-pill">{{ anime.type }}</span>
                <span v-if="anime.sub" class="meta-pill">EP {{ anime.sub }}</span>
                <span v-for="genre in anime.genres?.slice(0, 1)" :key="genre" class="meta-pill meta-pill--accent">
                  {{ genre }}
                </span>
              </div>

              <span
                class="mt-4 inline-flex items-center gap-1 text-[10px] font-black text-[var(--ctp-overlay1)] transition group-hover:text-[var(--ctp-pink)]"
              >
                <span>Open title</span>
                <span class="i-material-symbols-arrow-outward-rounded text-sm" />
              </span>
            </NuxtLink>

            <div v-if="!trendingAnime.length" class="trending-card rounded-2xl p-5">
              <p class="text-sm font-bold text-[var(--ctp-heading)]">Seasonal titles loading</p>
              <p class="mt-2 text-xs leading-5 text-[var(--ctp-subtext0)]">
                Current broadcast data appears after the catalog refresh.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <footer
        class="mx-auto flex w-full max-w-[1220px] flex-col gap-4 px-5 pb-10 pt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ctp-overlay0)] sm:px-8 md:flex-row md:items-center md:justify-between"
      >
        <span>© {{ currentYear }} Noxy / Anime catalog</span>
        <div class="flex flex-wrap gap-5">
          <NuxtLink to="/terms-of-service" class="footer-link">Terms</NuxtLink>
          <NuxtLink to="/dmca" class="footer-link">DMCA</NuxtLink>
          <NuxtLink to="/contact" class="footer-link">Contact</NuxtLink>
        </div>
      </footer>
    </template>
  </main>
</template>

<style scoped>
.index-page {
  --ctp-rosewater: #f5e0dc;
  --ctp-pink: #f5c2e7;
  --ctp-mauve: #cba6f7;
  --ctp-peach: #fab387;
  --ctp-yellow: #f9e2af;
  --ctp-green: #a6e3a1;
  --ctp-sky: #89dceb;
  --ctp-blue: #89b4fa;
  --ctp-lavender: #b4befe;
  --ctp-heading: #fff;
  --ctp-text: #cdd6f4;
  --ctp-subtext0: #a6adc8;
  --ctp-overlay1: #7f849c;
  --ctp-overlay0: #6c7086;
  --ctp-surface1: #45475a;
  --ctp-surface0: #313244;
  --ctp-base: #1e1e2e;
  --ctp-mantle: #181825;
  --ctp-crust: #11111b;

  color: var(--ctp-text);
  background: #202031;
}

.top-navigation {
  scrollbar-width: none;
}

.top-navigation::-webkit-scrollbar {
  display: none;
}

.top-link {
  flex: none;
  color: var(--ctp-heading);
  font-size: 0.83rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-decoration: none;
  transition: color 180ms ease;
}

.top-link:hover {
  color: var(--ctp-pink);
}

.hero-shell {
  border: 1px solid rgb(205 214 244 / 3%);
  background: #2a293c;
  box-shadow: 0 26px 80px rgb(17 17 27 / 16%);
}

.hero-artwork {
  filter: saturate(0.82) brightness(0.78);
}

.hero-artwork-overlay {
  background:
    linear-gradient(90deg, #2a293c 0%, #2a293c 44%, rgb(42 41 60 / 94%) 54%, rgb(42 41 60 / 52%) 69%, transparent 88%),
    linear-gradient(180deg, rgb(32 32 49 / 3%), rgb(32 32 49 / 15%));
}

.index-search-shell {
  border: 1px solid rgb(205 214 244 / 10%);
  background: rgb(24 24 37 / 92%);
  box-shadow: 0 18px 45px rgb(17 17 27 / 28%);
  backdrop-filter: blur(18px);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.index-search-shell:focus-within {
  border-color: rgb(245 194 231 / 55%);
  box-shadow:
    0 20px 48px rgb(17 17 27 / 34%),
    0 0 0 4px rgb(245 194 231 / 10%);
  transform: translateY(-1px);
}

.index-search-icon {
  color: var(--ctp-overlay1);
  background: rgb(205 214 244 / 5%);
  transition:
    color 180ms ease,
    background-color 180ms ease;
}

.index-search-shell:focus-within .index-search-icon {
  color: var(--ctp-pink);
  background: rgb(245 194 231 / 10%);
}

.index-search-input {
  color: var(--ctp-heading);
}

.index-search-input::placeholder {
  color: var(--ctp-overlay1);
}

.index-search-clear {
  color: var(--ctp-overlay1);
  transition:
    color 180ms ease,
    background-color 180ms ease;
}

.index-search-clear:hover {
  color: var(--ctp-pink);
  background: rgb(205 214 244 / 7%);
}

.index-filter-button,
.watch-button {
  color: var(--ctp-crust);
  background: #f4acd4;
  box-shadow: 0 12px 28px rgb(245 194 231 / 10%);
  transition:
    background-color 180ms ease,
    transform 180ms ease;
}

.index-filter-button:hover,
.watch-button:hover {
  color: var(--ctp-crust);
  background: var(--ctp-pink);
  transform: translateY(-1px);
}

.top-search-link {
  color: var(--ctp-text);
  transition: color 180ms ease;
}

.top-search-link:hover {
  color: var(--ctp-pink);
}

.community-banner {
  border: 1px solid rgb(245 194 231 / 28%);
  background: #2c2638;
  box-shadow: inset 0 1px rgb(255 255 255 / 2%);
}

.discord-button {
  background: #5d67ee;
  box-shadow: 0 6px 18px rgb(17 17 27 / 18%);
  transition:
    background-color 180ms ease,
    transform 180ms ease;
}

.discord-button:hover {
  color: white;
  background: #6f79f7;
  transform: translateY(-1px);
}

.info-card {
  border: 1px solid var(--ctp-surface0);
  background: rgb(42 41 60 / 62%);
}

.trending-card {
  border: 1px solid rgb(205 214 244 / 3%);
  color: var(--ctp-text);
  background: #2a293c;
  box-shadow: 0 14px 35px rgb(17 17 27 / 10%);
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.trending-card:hover {
  border-color: rgb(245 194 231 / 20%);
  color: var(--ctp-text);
  background: #302f44;
  transform: translateY(-2px);
}

.meta-pill {
  border-radius: 0.35rem;
  padding: 0.18rem 0.45rem;
  color: var(--ctp-yellow);
  background: rgb(249 226 175 / 8%);
  font-size: 0.52rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.meta-pill--accent {
  color: var(--ctp-pink);
  background: rgb(245 194 231 / 8%);
}

.footer-link {
  color: var(--ctp-overlay0);
  text-decoration: none;
  transition: color 180ms ease;
}

.footer-link:hover {
  color: var(--ctp-pink);
}

@media (max-width: 1023px) {
  .hero-artwork {
    opacity: 0.5;
  }

  .hero-artwork-overlay {
    background:
      linear-gradient(90deg, #2a293c 0%, rgb(42 41 60 / 92%) 45%, rgb(42 41 60 / 58%) 100%),
      linear-gradient(180deg, rgb(42 41 60 / 20%), rgb(42 41 60 / 60%));
  }
}

@media (max-width: 639px) {
  .hero-shell {
    border-radius: 1.7rem;
  }

  .hero-artwork {
    width: 100%;
    opacity: 0.32;
  }

  .hero-artwork-overlay {
    background: linear-gradient(90deg, rgb(42 41 60 / 96%), rgb(42 41 60 / 72%));
  }
}

@media (max-width: 479px) {
  .top-navigation {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    column-gap: 0.5rem;
  }

  .top-link {
    grid-column: span 2;
    text-align: center;
  }

  .top-link:nth-last-child(-n + 2) {
    grid-column: span 3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .top-link,
  .index-search-shell,
  .index-search-icon,
  .index-search-clear,
  .index-filter-button,
  .watch-button,
  .discord-button,
  .trending-card {
    transition: none;
  }
}
</style>
