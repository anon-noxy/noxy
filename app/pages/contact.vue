<script setup lang="ts">
const contactEmail = 'adrianolape@protonmail.com'
const contactAction = `https://formsubmit.co/${contactEmail}`

useSeoMeta({
  title: 'Contact - Noxy',
  description: 'Contact Noxy to report an issue, share feedback, request an anime update, or submit a rights inquiry.',
})
</script>

<template>
  <main
    class="relative min-h-screen overflow-hidden bg-[var(--color-background)] pb-16 pt-20 text-[var(--color-text)] sm:pb-20 sm:pt-24"
  >
    <div
      class="pointer-events-none absolute -right-32 top-8 h-80 w-80 rounded-full bg-pink-300/8 blur-3xl sm:h-[28rem] sm:w-[28rem]"
    />
    <div class="pointer-events-none absolute -left-40 top-[38rem] h-80 w-80 rounded-full bg-violet-400/6 blur-3xl" />

    <div class="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <NuxtLink
        to="/home"
        class="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-text)]/60 no-underline transition hover:text-pink-300"
      >
        <span class="i-material-symbols-arrow-back-rounded text-base" />
        Back to home
      </NuxtLink>

      <div class="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:gap-12">
        <section class="min-w-0 lg:sticky lg:top-24">
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-pink-300/75">Contact Noxy</p>
          <h1
            class="mt-3 max-w-xl text-3xl font-extrabold leading-tight text-[var(--color-heading)] sm:text-4xl lg:text-5xl"
          >
            Questions, feedback, or reports
          </h1>
          <p class="mt-5 max-w-xl text-sm leading-7 text-[var(--color-text)]/70 sm:text-base">
            Report a broken page, share an idea, request an anime update, or submit a rights-related inquiry. Complete
            details make each message easier to review.
          </p>

          <div class="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <article
              class="group grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/75 p-4 transition hover:border-pink-300/25 hover:bg-[var(--color-background-soft)]"
            >
              <span
                class="grid h-10 w-10 place-items-center rounded-lg bg-pink-300/12 text-pink-300 transition group-hover:bg-pink-300 group-hover:text-black"
              >
                <span class="i-material-symbols-bug-report-outline-rounded text-xl" />
              </span>
              <div class="min-w-0">
                <h2 class="text-sm font-extrabold text-[var(--color-heading)]">Report a problem</h2>
                <p class="mt-1 text-xs leading-5 text-[var(--color-text)]/55">
                  Include the anime title, episode, language, and what went wrong.
                </p>
              </div>
            </article>

            <article
              class="group grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/75 p-4 transition hover:border-pink-300/25 hover:bg-[var(--color-background-soft)]"
            >
              <span
                class="grid h-10 w-10 place-items-center rounded-lg bg-pink-300/12 text-pink-300 transition group-hover:bg-pink-300 group-hover:text-black"
              >
                <span class="i-material-symbols-lightbulb-outline-rounded text-xl" />
              </span>
              <div class="min-w-0">
                <h2 class="text-sm font-extrabold text-[var(--color-heading)]">Feedback or requests</h2>
                <p class="mt-1 text-xs leading-5 text-[var(--color-text)]/55">
                  Suggest improvements or report missing and incorrect anime data.
                </p>
              </div>
            </article>

            <NuxtLink
              to="/dmca"
              class="group grid grid-cols-[42px_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-white/7 bg-[var(--color-background-soft)]/75 p-4 text-[var(--color-text)] no-underline transition hover:border-pink-300/25 hover:bg-[var(--color-background-soft)]"
            >
              <span
                class="grid h-10 w-10 place-items-center rounded-lg bg-pink-300/12 text-pink-300 transition group-hover:bg-pink-300 group-hover:text-black"
              >
                <span class="i-material-symbols-gavel-rounded text-xl" />
              </span>
              <div class="min-w-0">
                <h2 class="text-sm font-extrabold text-[var(--color-heading)]">Rights and DMCA</h2>
                <p class="mt-1 text-xs leading-5 text-[var(--color-text)]/55">
                  Review the required information before submitting a request.
                </p>
              </div>
              <span
                class="i-material-symbols-arrow-forward-rounded mt-1 text-lg text-[var(--color-text)]/35 transition group-hover:translate-x-0.5 group-hover:text-pink-300"
              />
            </NuxtLink>
          </div>

          <div class="mt-6 rounded-xl border border-pink-300/12 bg-pink-300/[0.055] p-4">
            <div class="flex items-start gap-3">
              <span class="i-material-symbols-info-outline-rounded mt-0.5 shrink-0 text-lg text-pink-300" />
              <p class="text-xs leading-5 text-[var(--color-text)]/65">
                Noxy is a personal project, so responses may not be immediate. Please avoid sending the same request
                repeatedly.
              </p>
            </div>
          </div>
        </section>

        <section
          class="overflow-hidden rounded-2xl border border-white/8 bg-[var(--color-background-soft)] shadow-2xl shadow-black/15"
          aria-labelledby="contact-form-title"
        >
          <div
            class="relative overflow-hidden border-b border-white/7 bg-[linear-gradient(135deg,rgba(249,168,212,.13),rgba(32,31,52,.8)_55%,rgba(24,24,39,.95))] p-5 sm:p-7"
          >
            <div
              class="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-pink-300/10 blur-3xl"
            />
            <div class="relative flex items-start justify-between gap-5">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-pink-300/70">Message form</p>
                <h2 id="contact-form-title" class="mt-2 text-2xl font-extrabold text-[var(--color-heading)]">
                  Send a message
                </h2>
                <p class="mt-2 max-w-xl text-sm leading-6 text-[var(--color-text)]/60">
                  Required fields are marked below. Please do not include passwords or other sensitive information.
                </p>
              </div>
              <span
                class="hidden h-11 w-11 shrink-0 place-items-center rounded-xl border border-pink-300/15 bg-pink-300/10 text-pink-300 sm:grid"
              >
                <span class="i-material-symbols-mail-outline-rounded text-2xl" />
              </span>
            </div>
          </div>

          <form :action="contactAction" method="POST" class="grid gap-5 p-5 sm:p-7">
            <input type="hidden" name="_subject" value="Noxy contact form" />
            <input type="hidden" name="_template" value="table" />
            <input type="text" name="_honey" class="hidden" tabindex="-1" autocomplete="off" />

            <div class="grid gap-5 sm:grid-cols-2">
              <label class="grid gap-2">
                <span class="text-xs font-extrabold text-[var(--color-heading)]">
                  Name <span class="text-pink-300">*</span>
                </span>
                <span class="relative">
                  <span
                    class="i-material-symbols-person-outline-rounded pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[var(--color-text)]/35"
                  />
                  <input
                    name="name"
                    type="text"
                    required
                    autocomplete="name"
                    class="h-12 w-full rounded-lg border border-white/8 bg-[var(--color-background)] pl-11 pr-4 text-sm text-[var(--color-heading)] outline-none transition placeholder:text-[var(--color-text)]/35 hover:border-white/15 focus:border-pink-300/60 focus:ring-2 focus:ring-pink-300/10"
                    placeholder="Full name"
                  />
                </span>
              </label>

              <label class="grid gap-2">
                <span class="text-xs font-extrabold text-[var(--color-heading)]">
                  Email <span class="text-pink-300">*</span>
                </span>
                <span class="relative">
                  <span
                    class="i-material-symbols-alternate-email-rounded pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[var(--color-text)]/35"
                  />
                  <input
                    name="email"
                    type="email"
                    required
                    autocomplete="email"
                    class="h-12 w-full rounded-lg border border-white/8 bg-[var(--color-background)] pl-11 pr-4 text-sm text-[var(--color-heading)] outline-none transition placeholder:text-[var(--color-text)]/35 hover:border-white/15 focus:border-pink-300/60 focus:ring-2 focus:ring-pink-300/10"
                    placeholder="name@example.com"
                  />
                </span>
              </label>
            </div>

            <label class="grid gap-2">
              <span class="text-xs font-extrabold text-[var(--color-heading)]">
                Topic <span class="text-pink-300">*</span>
              </span>
              <span class="relative">
                <span
                  class="i-material-symbols-topic-outline-rounded pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[var(--color-text)]/35"
                />
                <select
                  name="topic"
                  required
                  class="h-12 w-full appearance-none rounded-lg border border-white/8 bg-[var(--color-background)] pl-11 pr-11 text-sm text-[var(--color-heading)] outline-none transition hover:border-white/15 focus:border-pink-300/60 focus:ring-2 focus:ring-pink-300/10"
                >
                  <option value="" disabled selected>Choose a topic</option>
                  <option>General feedback</option>
                  <option>Broken page or player</option>
                  <option>Incorrect anime information</option>
                  <option>Content request</option>
                  <option>DMCA or rights request</option>
                  <option>Other</option>
                </select>
                <span
                  class="i-material-symbols-expand-more-rounded pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xl text-[var(--color-text)]/40"
                />
              </span>
            </label>

            <label class="grid gap-2">
              <span class="text-xs font-extrabold text-[var(--color-heading)]">
                Message <span class="text-pink-300">*</span>
              </span>
              <textarea
                name="message"
                required
                rows="7"
                class="min-h-40 w-full resize-y rounded-lg border border-white/8 bg-[var(--color-background)] px-4 py-3.5 text-sm leading-6 text-[var(--color-heading)] outline-none transition placeholder:text-[var(--color-text)]/35 hover:border-white/15 focus:border-pink-300/60 focus:ring-2 focus:ring-pink-300/10"
                placeholder="Describe the issue, expected result, and any steps needed to reproduce the problem."
              ></textarea>
            </label>

            <div
              class="flex flex-col gap-4 border-t border-white/7 pt-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="max-w-sm text-[10px] leading-4 text-[var(--color-text)]/40">
                Submitted information should be accurate and appropriate for review.
              </p>
              <button
                type="submit"
                class="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border-0 bg-pink-300 px-5 text-sm font-black text-black shadow-lg shadow-pink-300/5 transition hover:bg-pink-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background-soft)]"
              >
                Send message
                <span
                  class="i-material-symbols-send-rounded text-lg transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  </main>
</template>
