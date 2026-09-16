<script setup lang="ts">
const lastUpdated = 'August 30, 2026'

const sections = [
  ['scope', 'Scope of this policy'],
  ['separation', 'Service separation'],
  ['streaming', 'Streaming complaints'],
  ['metadata', 'Metadata and artwork'],
  ['notice', 'What a notice should include'],
  ['submission', 'Submitting a notice'],
  ['response', 'Review and response'],
  ['counter', 'Counter-notices'],
  ['misrepresentation', 'Misrepresentation'],
] as const

useSeoMeta({
  title: 'Copyright and DMCA - Noxy',
  description:
    'Copyright reporting information for Noxy, including the separation between MyAnimeList metadata and independent third-party playback services.',
})
</script>

<template>
  <main
    class="relative min-h-screen overflow-hidden bg-[var(--color-background)] pb-16 pt-20 text-[var(--color-text)] sm:pb-20 sm:pt-24"
  >
    <div
      class="pointer-events-none absolute -right-40 top-12 h-[30rem] w-[30rem] rounded-full bg-pink-300/7 blur-3xl"
    />
    <div class="pointer-events-none absolute -left-48 top-[46rem] h-96 w-96 rounded-full bg-violet-400/5 blur-3xl" />

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
            Copyright and DMCA
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-text)]/70 sm:text-base">
            This page explains how copyright concerns involving the Noxy interface, MyAnimeList metadata, or an
            independent streaming provider should be directed.
          </p>
          <div class="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span class="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-white/65">
              Updated {{ lastUpdated }}
            </span>
            <span class="rounded-full border border-pink-300/15 bg-pink-300/8 px-3 py-1.5 text-pink-200">
              Good-faith reporting process
            </span>
          </div>
        </div>
      </header>

      <section class="mt-5 grid gap-3 sm:grid-cols-3">
        <article class="rounded-xl border border-white/7 bg-[var(--color-background-soft)]/75 p-4">
          <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/70">Noxy</p>
          <h2 class="mt-2 text-sm font-extrabold text-[var(--color-heading)]">Interface and references</h2>
          <p class="mt-2 text-xs leading-5 text-[var(--color-text)]/55">
            Reports may request review of a Noxy page, link, embed, or displayed reference.
          </p>
        </article>
        <article class="rounded-xl border border-white/7 bg-[var(--color-background-soft)]/75 p-4">
          <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/70">Anime details</p>
          <h2 class="mt-2 text-sm font-extrabold text-[var(--color-heading)]">MyAnimeList API</h2>
          <p class="mt-2 text-xs leading-5 text-[var(--color-text)]/55">
            Catalog metadata and artwork displayed by Noxy are fetched through the MyAnimeList API.
          </p>
        </article>
        <article class="rounded-xl border border-white/7 bg-[var(--color-background-soft)]/75 p-4">
          <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/70">Video playback</p>
          <h2 class="mt-2 text-sm font-extrabold text-[var(--color-heading)]">Independent provider</h2>
          <p class="mt-2 text-xs leading-5 text-[var(--color-text)]/55">
            Video files and streaming servers are separate from Noxy and outside the project’s control.
          </p>
        </article>
      </section>

      <div
        class="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] p-4 text-xs leading-5 text-[var(--color-text)]/70"
      >
        <strong class="text-amber-200">Important:</strong>
        Removing a Noxy link or embed does not delete a video from an independent provider. A request concerning the
        hosted file itself should be sent to the service that stores or serves that file.
      </div>

      <div class="mt-8 grid items-start gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside class="lg:sticky lg:top-24">
          <nav
            class="overflow-hidden rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-3"
            aria-label="Copyright policy sections"
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

          <NuxtLink
            to="/contact"
            class="group mt-4 flex items-center justify-between gap-3 rounded-xl border border-pink-300/15 bg-pink-300/[0.07] p-4 text-xs font-bold text-pink-200 no-underline transition hover:border-pink-300/30 hover:bg-pink-300/10"
          >
            Submit a copyright report
            <span class="i-material-symbols-arrow-forward-rounded text-lg transition group-hover:translate-x-0.5" />
          </NuxtLink>
        </aside>

        <div class="min-w-0 space-y-4">
          <section
            id="scope"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">01 · Policy</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Scope of this policy</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Noxy is a personal, non-commercial anime discovery and navigation project. This page provides a
                good-faith process for reporting copyright concerns involving material displayed or referenced by the
                Noxy interface.
              </p>
              <p>
                This process does not represent that Noxy hosts video content, controls an independent streaming
                provider, or can remove a hosted file from a third-party server.
              </p>
            </div>
          </section>

          <section
            id="separation"
            class="scroll-mt-24 rounded-xl border border-pink-300/12 bg-[linear-gradient(135deg,rgba(249,168,212,.07),rgba(32,31,52,.75))] p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">02 · Responsibility</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Service separation</h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div class="rounded-lg border border-white/7 bg-black/15 p-4">
                <strong class="text-xs text-[var(--color-heading)]">Noxy project</strong>
                <p class="mt-2 text-xs leading-5 text-[var(--color-text)]/60">
                  Controls the Noxy interface, routes, presentation, and references shown on the site.
                </p>
              </div>
              <div class="rounded-lg border border-white/7 bg-black/15 p-4">
                <strong class="text-xs text-[var(--color-heading)]">MyAnimeList</strong>
                <p class="mt-2 text-xs leading-5 text-[var(--color-text)]/60">
                  Supplies anime catalog information through its API and manages that source data independently.
                </p>
              </div>
              <div class="rounded-lg border border-white/7 bg-black/15 p-4">
                <strong class="text-xs text-[var(--color-heading)]">Streaming provider</strong>
                <p class="mt-2 text-xs leading-5 text-[var(--color-text)]/60">
                  Operates the separate playback infrastructure and controls files available through that service.
                </p>
              </div>
            </div>
          </section>

          <section
            id="streaming"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">03 · Video content</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Streaming complaints</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Noxy does not upload, store, encode, transcode, or distribute anime video files. Playback is supplied by
                an independent third-party server that is not owned or operated by Noxy.
              </p>
              <p>
                A complaint directed to Noxy may result in review or disabling of a Noxy embed, link, or reference. Noxy
                cannot delete the underlying file, suspend a third-party account, or change the provider’s catalog.
              </p>
              <p>
                For removal of a hosted stream at its source, the notice should be sent to the provider, host, content
                delivery network, domain operator, or other service responsible for storing or serving the file.
              </p>
            </div>
          </section>

          <section
            id="metadata"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">04 · Catalog data</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Metadata and artwork</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Anime titles, descriptions, artwork, dates, scores, genres, studios, and related catalog details shown
                by Noxy are fetched through the MyAnimeList API.
              </p>
              <p>
                A report concerning Noxy’s display of a metadata field, image, or title page may be reviewed by the
                project. A correction or removal from the original source may also require a request to
                <a
                  href="https://myanimelist.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-bold text-pink-300 no-underline transition hover:text-pink-200"
                >
                  MyAnimeList
                </a>
                or the applicable rights holder.
              </p>
            </div>
          </section>

          <section
            id="notice"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">05 · Required details</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">What a notice should include</h2>
            <p class="mt-3 text-sm leading-7 text-[var(--color-text)]/75">
              Complete information helps identify the material and evaluate the requested action. A notice should
              include:
            </p>
            <ol class="mt-4 grid gap-2 text-sm leading-6 text-[var(--color-text)]/75">
              <li class="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-lg bg-black/10 px-4 py-3">
                <span class="font-black text-pink-300/65">01</span>
                The full legal name and contact information of the rights holder or authorized representative.
              </li>
              <li class="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-lg bg-black/10 px-4 py-3">
                <span class="font-black text-pink-300/65">02</span>
                Identification of the copyrighted work claimed to have been infringed.
              </li>
              <li class="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-lg bg-black/10 px-4 py-3">
                <span class="font-black text-pink-300/65">03</span>
                The exact Noxy page and a clear description of the link, embed, image, metadata, or reference at issue.
              </li>
              <li class="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-lg bg-black/10 px-4 py-3">
                <span class="font-black text-pink-300/65">04</span>
                The third-party host or stream URL, when the complaint concerns externally hosted video.
              </li>
              <li class="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-lg bg-black/10 px-4 py-3">
                <span class="font-black text-pink-300/65">05</span>
                A good-faith statement that the disputed use is not authorized by the owner, an agent, or the law.
              </li>
              <li class="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-lg bg-black/10 px-4 py-3">
                <span class="font-black text-pink-300/65">06</span>
                A statement that the notice is accurate and that the sender is authorized to act for the rights holder.
              </li>
              <li class="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-lg bg-black/10 px-4 py-3">
                <span class="font-black text-pink-300/65">07</span>
                A physical or electronic signature.
              </li>
            </ol>
          </section>

          <section
            id="submission"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">06 · Contact</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Submitting a notice</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Submit a notice through the
                <NuxtLink to="/contact" class="font-bold text-pink-300 no-underline transition hover:text-pink-200">
                  contact page
                </NuxtLink>
                and select <strong class="text-[var(--color-heading)]">DMCA or rights request</strong> as the topic.
              </p>
              <p>
                The contact form is a project reporting channel. It is not a representation that Noxy is the host of the
                disputed video or the operator of a statutory notice system for the independent provider.
              </p>
              <p>
                General information about U.S. notice-and-takedown procedures is available from the
                <a
                  href="https://www.copyright.gov/512/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-bold text-pink-300 no-underline transition hover:text-pink-200"
                >
                  U.S. Copyright Office</a
                >.
              </p>
            </div>
          </section>

          <section
            id="response"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">07 · Review</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Review and response</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Complete notices will be reviewed in good faith. Additional information may be requested when the
                material, ownership, authorization, or requested action is unclear.
              </p>
              <p>
                When appropriate, Noxy may remove or disable a page, image, link, embed, or reference within the Noxy
                interface. Such action does not remove material from MyAnimeList or an independent streaming server.
              </p>
            </div>
          </section>

          <section
            id="counter"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">08 · Disputes</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Counter-notices</h2>
            <p class="mt-3 text-sm leading-7 text-[var(--color-text)]/75">
              If a Noxy reference was removed or disabled because of a mistake or misidentification, a counter-notice
              may be submitted through the contact page. It should identify the affected material, explain the basis for
              the dispute, include accurate contact information, contain any statements required by applicable law, and
              include a physical or electronic signature.
            </p>
          </section>

          <section
            id="misrepresentation"
            class="scroll-mt-24 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/70 p-5 sm:p-6"
          >
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/65">09 · Accuracy</p>
            <h2 class="mt-2 text-xl font-extrabold text-[var(--color-heading)]">Misrepresentation and abuse</h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-[var(--color-text)]/75">
              <p>
                Copyright reports and counter-notices must not contain knowingly false, fraudulent, misleading, or
                unauthorized claims. Misrepresentation may create legal liability.
              </p>
              <p>
                Duplicate, automated, abusive, threatening, or unrelated submissions may be limited or disregarded.
                Records of reports may be retained when reasonably needed for review, abuse prevention, and project
                administration.
              </p>
            </div>
          </section>
        </div>
      </div>
    </article>
  </main>
</template>
