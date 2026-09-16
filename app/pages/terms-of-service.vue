<script setup lang="ts">
const lastUpdated = 'August 30, 2026'

const sections = [
  ['about', 'About Noxy'],
  ['metadata', 'MyAnimeList metadata'],
  ['playback', 'Third-party playback'],
  ['availability', 'Availability and accuracy'],
  ['use', 'Acceptable use'],
  ['prohibited', 'Prohibited activity'],
  ['data', 'Accounts and saved data'],
  ['ownership', 'Intellectual property'],
  ['copyright', 'Copyright reports'],
  ['disclaimer', 'Disclaimer'],
  ['liability', 'Limitation of liability'],
  ['changes', 'Changes and contact'],
] as const

useSeoMeta({
  title: 'Terms of Service - Noxy',
  description:
    'Terms for using Noxy, a personal anime discovery interface using MyAnimeList metadata and independent third-party playback services.',
})
</script>

<template>
  <main
    class="relative min-h-screen overflow-hidden bg-[var(--color-background)] pb-16 pt-20 text-[var(--color-text)] sm:pb-20 sm:pt-24"
  >
    <div
      class="pointer-events-none absolute -right-40 top-12 h-[30rem] w-[30rem] rounded-full bg-pink-300/7 blur-3xl"
    />
    <div class="pointer-events-none absolute -left-48 top-[48rem] h-96 w-96 rounded-full bg-violet-400/5 blur-3xl" />

    <article class="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <NuxtLink
        to="/home"
        class="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-text)]/60 no-underline transition hover:text-pink-300"
      >
        <span class="i-material-symbols-arrow-back-rounded text-base" />
        Back to home
      </NuxtLink>

      <header
        class="relative mt-7 overflow-hidden rounded-2xl border border-white/8 bg-[linear-gradient(135deg,rgba(249,168,212,.13),rgba(32,31,52,.88)_48%,rgba(24,24,39,.98))] p-6 sm:p-8 lg:p-10"
      >
        <div class="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-pink-300/10 blur-3xl" />
        <div class="relative max-w-4xl">
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-pink-300/75">Noxy legal</p>
          <h1 class="mt-3 text-3xl font-extrabold leading-tight text-[var(--color-heading)] sm:text-4xl lg:text-5xl">
            Terms of Service
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-text)]/70 sm:text-base">
            These terms explain how Noxy may be used and clarify the separation between this personal project,
            MyAnimeList metadata, and independent third-party playback services.
          </p>
          <div class="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span class="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-white/65">
              Updated {{ lastUpdated }}
            </span>
            <span class="rounded-full border border-pink-300/15 bg-pink-300/8 px-3 py-1.5 text-pink-200">
              Personal project
            </span>
            <span class="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-white/65">
              Non-commercial use
            </span>
          </div>
        </div>
      </header>

      <section class="mt-5 grid gap-3 sm:grid-cols-3">
        <article class="rounded-xl border border-white/7 bg-[var(--color-background-soft)]/75 p-4">
          <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/70">Project</p>
          <h2 class="mt-2 text-sm font-extrabold text-[var(--color-heading)]">Personal Noxy interface</h2>
          <p class="mt-2 text-xs leading-5 text-[var(--color-text)]/55">
            Noxy is independently maintained for anime discovery, organization, and navigation.
          </p>
        </article>
        <article class="rounded-xl border border-white/7 bg-[var(--color-background-soft)]/75 p-4">
          <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/70">Anime details</p>
          <h2 class="mt-2 text-sm font-extrabold text-[var(--color-heading)]">MyAnimeList API</h2>
          <p class="mt-2 text-xs leading-5 text-[var(--color-text)]/55">
            Catalog information displayed by Noxy is fetched through the MyAnimeList API.
          </p>
        </article>
        <article class="rounded-xl border border-white/7 bg-[var(--color-background-soft)]/75 p-4">
          <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/70">Playback</p>
          <h2 class="mt-2 text-sm font-extrabold text-[var(--color-heading)]">Independent provider</h2>
          <p class="mt-2 text-xs leading-5 text-[var(--color-text)]/55">
            Streaming servers are separate third-party services that Noxy does not own or control.
          </p>
        </article>
      </section>

      <div class="mt-8 grid items-start gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside class="lg:sticky lg:top-24">
          <nav
            class="overflow-hidden rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-3"
            aria-label="Terms sections"
          >
            <p class="px-3 pb-2 pt-1 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--color-text)]/40">
              On this page
            </p>
            <a
              v-for="([anchor, label], index) in sections"
              :key="anchor"
              :href="`#${anchor}`"
              class="group grid grid-cols-[24px_minmax(0,1fr)] items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-text)]/60 no-underline transition hover:bg-white/5 hover:text-pink-300"
            >
              <span class="text-[9px] font-black text-[var(--color-text)]/25 group-hover:text-pink-300/60">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              {{ label }}
            </a>
          </nav>

          <div class="mt-4 rounded-xl border border-pink-300/12 bg-pink-300/[0.055] p-4">
            <p class="text-xs leading-5 text-[var(--color-text)]/65">
              Questions about these terms can be sent through the
              <NuxtLink to="/contact" class="font-bold text-pink-300 no-underline hover:text-pink-200">
                contact page</NuxtLink
              >.
            </p>
          </div>
        </aside>

        <div class="min-w-0 space-y-4">
          <section
            id="about"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">01 · Service</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">About Noxy</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Noxy is a personal, independently maintained anime discovery and navigation project. It provides an
                interface for browsing anime information, organizing watch progress and watchlists, and opening playback
                supplied by external services.
              </p>
              <p>
                Noxy is not MyAnimeList, is not operated by MyAnimeList, and is not the operator of the third-party
                streaming servers presented through the watch interface.
              </p>
            </div>
          </section>

          <section
            id="metadata"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">02 · Data source</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">MyAnimeList metadata</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Anime titles, descriptions, artwork, dates, episode counts, scores, genres, studios, relationships, and
                other catalog details displayed by Noxy are fetched through the MyAnimeList API.
              </p>
              <p>
                Noxy does not claim ownership of data or artwork supplied by MyAnimeList or the applicable rights
                holders. MyAnimeList may change, correct, restrict, or remove API data independently of Noxy.
              </p>
              <p>
                Noxy may format, cache, combine, or present API responses for its interface, but cannot guarantee that
                every field is complete, current, or error-free. Source-level corrections may need to be addressed
                through
                <a
                  href="https://myanimelist.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-bold text-pink-300 no-underline transition hover:text-pink-200"
                >
                  MyAnimeList</a
                >.
              </p>
            </div>
          </section>

          <section
            id="playback"
            class="scroll-mt-24 rounded-xl border border-pink-300/12 bg-[linear-gradient(135deg,rgba(249,168,212,.07),rgba(32,31,52,.75))] p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">03 · Important</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Third-party playback</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Noxy does not upload, store, encode, transcode, or distribute anime video files. The streaming server
                used for playback is technically and operationally separate from Noxy and is provided by an independent
                third party.
              </p>
              <p>
                Noxy does not control that provider’s servers, stream catalog, availability, advertisements, privacy
                practices, security, content, or removal process. A player, stream, subtitle, or dub may be unavailable,
                delayed, incorrect, changed, or removed without notice.
              </p>
              <p>
                Opening or using an external player may create a direct interaction between your browser and the
                third-party provider. Your use of that provider is subject to its own terms and policies. Displaying an
                embed or link does not mean Noxy owns, endorses, or has editorial control over the hosted material.
              </p>
            </div>
          </section>

          <section
            id="availability"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">04 · Reliability</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Availability and accuracy</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Noxy, the MyAnimeList API, and third-party playback providers may experience downtime, delays, API
                limits, missing data, broken embeds, or other interruptions. Features may change or be removed at any
                time.
              </p>
              <p>
                Episode counts, release dates, scores, availability labels, subtitles, dubs, and other information are
                provided for convenience and are not guaranteed to be complete or accurate.
              </p>
            </div>
          </section>

          <section
            id="use"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">05 · Your use</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Personal and lawful use</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Noxy is intended for personal, non-commercial anime discovery and organization. You are responsible for
                following the laws that apply to you and for deciding whether you may access any external content in
                your location.
              </p>
              <p>
                You must also follow any applicable terms imposed by MyAnimeList and by third-party services you choose
                to open through Noxy.
              </p>
            </div>
          </section>

          <section
            id="prohibited"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">06 · Restrictions</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Prohibited activity</h2>
            <ul class="mt-3 grid gap-2 text-sm leading-6 text-[var(--color-text)]/75">
              <li class="rounded-lg bg-black/10 px-4 py-3">
                Do not disrupt, overload, attack, reverse engineer, or attempt to bypass Noxy security or rate limits.
              </li>
              <li class="rounded-lg bg-black/10 px-4 py-3">
                Do not scrape, mirror, resell, or commercially exploit Noxy or data obtained through it.
              </li>
              <li class="rounded-lg bg-black/10 px-4 py-3">
                Do not submit malware, spam, phishing content, fraudulent reports, or abusive automated requests.
              </li>
              <li class="rounded-lg bg-black/10 px-4 py-3">
                Do not use Noxy to infringe copyrights, trademarks, privacy rights, or other third-party rights.
              </li>
              <li class="rounded-lg bg-black/10 px-4 py-3">
                Do not impersonate another person, rights holder, provider, or representative of Noxy.
              </li>
            </ul>
          </section>

          <section
            id="data"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">07 · Preferences</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Accounts and saved data</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Features such as watch progress, watchlists, and preferences may use browser storage or account-related
                storage. You are responsible for access to your device and account.
              </p>
              <p>
                Saved information may be lost when browser data is cleared, a feature changes, an account is removed, or
                a storage service becomes unavailable. Noxy does not guarantee permanent backup or recovery.
              </p>
            </div>
          </section>

          <section
            id="ownership"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">08 · Ownership</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Intellectual property</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Anime names, characters, artwork, descriptions, trademarks, video, and related materials belong to their
                respective owners. Noxy makes no ownership claim over material supplied by MyAnimeList, third-party
                providers, studios, publishers, or other rights holders.
              </p>
              <p>
                The original Noxy interface, branding, and project code remain subject to their applicable ownership and
                license terms.
              </p>
            </div>
          </section>

          <section
            id="copyright"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">09 · Reports</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Copyright reports</h2>
            <p class="mt-3 text-sm leading-7 text-[var(--color-text)]/75">
              If you believe a Noxy page, link, embed, image, or metadata reference infringes your rights, review the
              <NuxtLink to="/dmca" class="font-bold text-pink-300 no-underline transition hover:text-pink-200">
                Copyright and DMCA page
              </NuxtLink>
              before contacting Noxy. Complaints about a video file hosted by a third-party streaming server should also
              be directed to the provider that stores or serves that file.
            </p>
          </section>

          <section
            id="disclaimer"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">10 · No warranties</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Disclaimer</h2>
            <p class="mt-3 text-sm leading-7 text-[var(--color-text)]/75">
              Noxy is provided on an “as is” and “as available” basis without guarantees of uninterrupted operation,
              accuracy, fitness for a particular purpose, non-infringement, player availability, metadata completeness,
              or compatibility with every device.
            </p>
          </section>

          <section
            id="liability"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">11 · Responsibility</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Limitation of liability</h2>
            <p class="mt-3 text-sm leading-7 text-[var(--color-text)]/75">
              To the fullest extent permitted by applicable law, Noxy and its maintainer are not responsible for losses,
              damages, data loss, device issues, external advertisements, privacy practices, unavailable streams, API
              changes, or other consequences caused by MyAnimeList, a third-party provider, or your use of an external
              service.
            </p>
          </section>

          <section
            id="changes"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">12 · Updates</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Changes and contact</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                These terms may be updated when the project, data sources, playback integration, or legal requirements
                change. The updated date at the top identifies the current version.
              </p>
              <p>
                Continued use after an update means you accept the revised terms. Questions may be submitted through the
                <NuxtLink to="/contact" class="font-bold text-pink-300 no-underline transition hover:text-pink-200">
                  contact page</NuxtLink
                >.
              </p>
            </div>
          </section>
        </div>
      </div>
    </article>
  </main>
</template>
