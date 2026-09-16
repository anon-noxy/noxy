<script setup lang="ts">
const discordInviteUrl = 'https://discord.gg/Nsx8WNNCk'
const xmppInviteUrl = 'xmpp:chat@muc.based.pt?join'

const azItems = [
  { label: 'All', to: '/az/all' },
  { label: '#', to: '/az/symbol' },
  { label: '0-9', to: '/az/number' },
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => ({
    label: letter,
    to: `/az/${letter.toLowerCase()}`,
  })),
]
</script>

<template>
  <footer class="border-t border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]">
    <div class="px-8 py-12 md:px-12">
      <div>
        <div class="flex flex-col gap-8 md:flex-row md:items-center">
          <div class="flex flex-col gap-8 sm:flex-row sm:items-center">
            <NuxtLink to="/home" aria-label="Noxy home">
              <NRemoteImage
                src="/images/logo.svg"
                alt="Noxy"
                class="h-16 w-auto"
                width="96"
                height="64"
                draggable="false"
              />
            </NuxtLink>

            <div class="hidden h-16 w-px bg-[var(--color-border)] md:block" />

            <div class="flex items-center gap-4">
              <div class="text-sm leading-tight text-[var(--color-text)]/70">
                <div>Join</div>
                <div>now</div>
              </div>

              <div class="flex gap-2">
                <NuxtLink
                  :to="discordInviteUrl"
                  external
                  aria-label="Join Discord"
                  class="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#5d67ee] px-4 text-xs font-black text-white no-underline transition hover:-translate-y-px hover:bg-[#6f79f7] hover:text-white"
                >
                  <span class="i-ic-baseline-discord text-base" />
                  <span>Join Discord</span>
                </NuxtLink>

                <NuxtLink
                  :to="xmppInviteUrl"
                  external
                  aria-label="Join XMPP"
                  class="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#89dceb] px-4 text-xs font-black text-[#11111b] no-underline transition hover:-translate-y-px hover:bg-[#a6e3e1] hover:text-[#11111b]"
                >
                  <span class="i-mdi-xmpp text-base" />
                  <span>Join XMPP</span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 h-px w-full bg-[var(--color-border)]" aria-hidden="true" />
      </div>

      <div class="mb-6 mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div class="flex items-center gap-4">
          <h3 class="text-[24px] font-bold uppercase">A - Z List</h3>
          <div class="hidden h-6 w-px bg-[var(--color-border)] sm:block" />
        </div>

        <p class="text-[15px] text-[var(--color-text)]/85">Searching anime order by alphabet name A to Z.</p>
      </div>

      <div class="mb-6 flex flex-wrap gap-2">
        <NuxtLink
          v-for="item in azItems"
          :key="item.label"
          :to="item.to"
          class="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 text-[14px] font-semibold text-[var(--color-text)] no-underline transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-background-mute)] hover:text-pink-300"
        >
          {{ item.label }}
        </NuxtLink>
      </div>

      <div class="mb-4 flex flex-wrap gap-x-8 gap-y-3 text-[15px] text-[var(--color-text)]/90">
        <NuxtLink to="/terms-of-service" class="text-[var(--color-text)] no-underline transition hover:text-pink-300">
          Terms of service
        </NuxtLink>
        <NuxtLink to="/dmca" class="text-[var(--color-text)] no-underline transition hover:text-pink-300">
          DMCA
        </NuxtLink>
        <NuxtLink to="/contact" class="text-[var(--color-text)] no-underline transition hover:text-pink-300">
          Contact
        </NuxtLink>
      </div>

      <div class="space-y-2 text-[15px] text-[var(--color-text)]/60">
        <p>
          Noxy does not store any files on our server, we only linked to the media which is hosted on 3rd party
          services.
        </p>
        <p>© Noxy. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>
