<script setup lang="ts">
definePageMeta({
  middleware: ['auth-client'],
})

const { displayName, isAuthenticated, isConfigured, isReady, profile, supabase, updatePassword, updateProfile, user } =
  useSupabaseAuth()

const username = ref('')
const bio = ref('')
const avatarUrl = ref('')
const password = ref('')
const confirmPassword = ref('')
const profileMessage = ref('')
const profileError = ref('')
const passwordMessage = ref('')
const passwordError = ref('')
const isSavingProfile = ref(false)
const isSavingPassword = ref(false)
const isUploadingAvatar = ref(false)
const isPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)

const avatarPreview = computed(() => avatarUrl.value.trim())
const accountInitial = computed(() => displayName.value.trim().charAt(0).toUpperCase() || 'A')
const accountEmail = computed(() => profile.value?.email || user.value?.email || '')
const accountCreatedAt = computed(() => profile.value?.created_at || user.value?.created_at || '')
const publicProfilePath = computed(() => `/user/${encodeURIComponent(profile.value?.username || displayName.value)}`)

const formatMonthYear = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const syncProfileForm = () => {
  username.value = profile.value?.username || ''
  bio.value = profile.value?.bio || ''
  avatarUrl.value = profile.value?.avatar_url || ''
}

const errorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error && error.message ? error.message : fallback
}

const saveProfile = async () => {
  profileMessage.value = ''
  profileError.value = ''
  isSavingProfile.value = true

  try {
    await updateProfile({
      username: username.value,
      bio: bio.value,
      avatarUrl: avatarUrl.value,
    })
    profileMessage.value = 'Your public profile has been updated.'
  } catch (error) {
    profileError.value = errorMessage(error, 'Unable to update profile.')
  } finally {
    isSavingProfile.value = false
  }
}

const savePassword = async () => {
  passwordMessage.value = ''
  passwordError.value = ''
  isSavingPassword.value = true

  try {
    await updatePassword({
      password: password.value,
      confirmPassword: confirmPassword.value,
    })
    password.value = ''
    confirmPassword.value = ''
    isPasswordVisible.value = false
    isConfirmPasswordVisible.value = false
    passwordMessage.value = 'Your password has been updated.'
  } catch (error) {
    passwordError.value = errorMessage(error, 'Unable to update password.')
  } finally {
    isSavingPassword.value = false
  }
}

const openAvatarPicker = () => {
  avatarInput.value?.click()
}

const uploadAvatar = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const userId = user.value?.id

  if (!file || !supabase || !userId) return

  profileMessage.value = ''
  profileError.value = ''

  if (!file.type.startsWith('image/')) {
    profileError.value = 'Choose an image file.'
    input.value = ''
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    profileError.value = 'Profile picture must be 2 MB or smaller.'
    input.value = ''
    return
  }

  isUploadingAvatar.value = true

  try {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
    const path = `${userId}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) throw error

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)

    avatarUrl.value = data.publicUrl
    await saveProfile()
    profileMessage.value = 'Your profile picture has been updated.'
  } catch (error) {
    profileError.value = errorMessage(error, 'Unable to upload profile picture.')
  } finally {
    isUploadingAvatar.value = false
    input.value = ''
  }
}

watch(profile, syncProfileForm, { immediate: true })

useSeoMeta({
  title: 'Settings - Noxy',
  description: 'Manage your Noxy public profile, profile picture, and account password.',
})
</script>

<template>
  <main class="min-h-screen bg-[var(--color-background)] px-4 pb-18 pt-22 text-[var(--color-text)] sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl">
      <template v-if="!isReady">
        <header
          class="animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/60 p-5 sm:p-7 lg:p-8"
        >
          <div class="h-4 w-28 rounded bg-[var(--color-background-mute)]" />
          <div class="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
            <div>
              <div class="h-4 w-32 rounded bg-[var(--color-background-mute)]" />
              <div class="mt-4 h-10 w-56 rounded bg-[var(--color-background-mute)]" />
              <div class="mt-3 h-4 w-80 max-w-full rounded bg-[var(--color-background-mute)]" />
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div v-for="index in 3" :key="index" class="h-24 rounded-xl bg-[var(--color-background-mute)]" />
            </div>
          </div>
        </header>

        <div class="mt-5 grid animate-pulse gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="h-128 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55" />
          <div class="h-96 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55" />
        </div>
      </template>

      <template v-else-if="isAuthenticated">
        <header
          class="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/60 p-5 sm:p-7 lg:p-8"
        >
          <div class="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-pink-300/10 blur-3xl" />
          <div class="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-sapphire/8 blur-3xl" />

          <div class="relative">
            <div class="flex items-center justify-between gap-4">
              <NuxtLink
                to="/profile"
                class="inline-flex items-center gap-1.5 text-xs font-black text-pink-300 no-underline transition hover:text-pink-200"
              >
                <div i-material-symbols-arrow-back-rounded class="text-base" />
                <span>Back to profile</span>
              </NuxtLink>

              <NuxtLink
                :to="publicProfilePath"
                class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/35 px-3 text-xs font-bold text-[var(--color-heading)] no-underline transition hover:border-pink-300/40 hover:text-pink-300"
              >
                <div i-material-symbols-visibility-rounded class="text-base" />
                <span class="hidden sm:inline">View public profile</span>
                <span class="sm:hidden">View profile</span>
              </NuxtLink>
            </div>

            <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)] lg:items-end">
              <div class="min-w-0">
                <div
                  class="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-300/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-pink-200"
                >
                  <div i-material-symbols-tune-rounded class="text-base" />
                  Account settings
                </div>
                <h1
                  class="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-[var(--color-heading)] sm:text-4xl lg:text-5xl"
                >
                  Make Noxy yours.
                </h1>
                <p class="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text)]/65 sm:text-base">
                  Update how you appear to the community and keep your account secure.
                </p>
              </div>

              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                <div
                  class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-3.5 sm:p-4"
                >
                  <div class="flex items-center gap-2 text-[var(--color-text)]/45">
                    <div i-material-symbols-alternate-email-rounded class="text-lg text-pink-300" />
                    <span class="text-[10px] font-black uppercase tracking-wider">Username</span>
                  </div>
                  <p class="mt-3 truncate text-sm font-black text-[var(--color-heading)]">@{{ displayName }}</p>
                </div>

                <div
                  class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-3.5 sm:p-4"
                >
                  <div class="flex items-center gap-2 text-[var(--color-text)]/45">
                    <div i-material-symbols-event-rounded class="text-lg text-pink-300" />
                    <span class="text-[10px] font-black uppercase tracking-wider">Member since</span>
                  </div>
                  <p class="mt-3 text-sm font-black text-[var(--color-heading)]">
                    {{ formatMonthYear(accountCreatedAt) }}
                  </p>
                </div>

                <div
                  class="col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-3.5 sm:col-span-1 sm:p-4 lg:col-span-2 xl:col-span-1"
                >
                  <div class="flex items-center gap-2 text-[var(--color-text)]/45">
                    <div i-material-symbols-public-rounded class="text-lg text-pink-300" />
                    <span class="text-[10px] font-black uppercase tracking-wider">Visibility</span>
                  </div>
                  <p class="mt-3 text-sm font-black text-[var(--color-heading)]">Public</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section
          v-if="!isConfigured"
          class="mt-5 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-500/8 p-4 text-sm text-red-200"
        >
          <div i-material-symbols-cloud-off-rounded class="mt-0.5 shrink-0 text-xl" />
          <div>
            <p class="font-black">Account connection unavailable</p>
            <p class="mt-1 leading-6 text-red-200/75">
              Add your public Supabase URL and anon key to the environment to update account settings.
            </p>
          </div>
        </section>

        <div class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div class="space-y-5">
            <form
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5 sm:p-6"
              @submit.prevent="saveProfile"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pink-300">Public identity</p>
                  <h2 class="mt-1 text-xl font-extrabold text-[var(--color-heading)]">Profile details</h2>
                  <p class="mt-1 text-xs leading-5 text-[var(--color-text)]/50">
                    This information appears on your community profile.
                  </p>
                </div>
                <div
                  class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-pink-300/20 bg-pink-300/8 text-pink-300"
                >
                  <div i-material-symbols-person-edit-rounded class="text-xl" />
                </div>
              </div>

              <div class="mt-6 grid gap-5">
                <label class="block">
                  <span class="text-xs font-black text-[var(--color-heading)]">Username</span>
                  <span class="mt-1 block text-[11px] leading-5 text-[var(--color-text)]/45">
                    3–24 letters, numbers, or underscores. Your profile URL changes with it.
                  </span>
                  <div class="relative mt-2">
                    <span
                      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-pink-300"
                    >
                      @
                    </span>
                    <input
                      v-model="username"
                      type="text"
                      autocomplete="username"
                      autocapitalize="none"
                      spellcheck="false"
                      required
                      minlength="3"
                      maxlength="24"
                      pattern="[A-Za-z0-9_]{3,24}"
                      class="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/55 pl-8 pr-3 text-sm font-bold text-[var(--color-heading)] outline-none placeholder:text-[var(--color-text)]/35 focus:border-pink-300/55 focus:ring-2 focus:ring-pink-300/10"
                    />
                  </div>
                </label>

                <label class="block">
                  <span class="flex items-center justify-between gap-3">
                    <span class="text-xs font-black text-[var(--color-heading)]">Bio</span>
                    <span class="text-[10px] font-bold text-[var(--color-text)]/40">{{ bio.length }}/240</span>
                  </span>
                  <textarea
                    v-model="bio"
                    rows="5"
                    maxlength="240"
                    class="mt-2 w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/55 px-3 py-3 text-sm font-medium leading-6 text-[var(--color-heading)] outline-none placeholder:text-[var(--color-text)]/35 focus:border-pink-300/55 focus:ring-2 focus:ring-pink-300/10"
                    placeholder="Tell the community a little about yourself..."
                  />
                </label>

                <label class="block">
                  <span class="text-xs font-black text-[var(--color-heading)]">Profile picture URL</span>
                  <span class="mt-1 block text-[11px] leading-5 text-[var(--color-text)]/45">
                    Paste a direct HTTPS image URL or upload a file from the picture panel.
                  </span>
                  <div class="relative mt-2">
                    <div
                      i-material-symbols-link-rounded
                      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[var(--color-text)]/40"
                    />
                    <input
                      v-model="avatarUrl"
                      type="url"
                      autocomplete="url"
                      class="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/55 pl-10 pr-3 text-sm font-medium text-[var(--color-heading)] outline-none placeholder:text-[var(--color-text)]/35 focus:border-pink-300/55 focus:ring-2 focus:ring-pink-300/10"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </label>
              </div>

              <div
                v-if="profileMessage"
                class="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-300/20 bg-emerald-500/8 p-3 text-sm text-emerald-200"
                role="status"
              >
                <div i-material-symbols-check-circle-rounded class="mt-0.5 shrink-0 text-lg" />
                <p class="font-bold leading-5">{{ profileMessage }}</p>
              </div>
              <div
                v-if="profileError"
                class="mt-5 flex items-start gap-2.5 rounded-lg border border-red-300/20 bg-red-500/8 p-3 text-sm text-red-200"
                role="alert"
              >
                <div i-material-symbols-error-outline-rounded class="mt-0.5 shrink-0 text-lg" />
                <p class="font-bold leading-5">{{ profileError }}</p>
              </div>

              <div
                class="mt-6 flex flex-col gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:items-center"
              >
                <button
                  type="submit"
                  class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-0 bg-pink-300 px-5 text-sm font-black text-black transition hover:bg-pink-200 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isSavingProfile || isUploadingAvatar || !isConfigured"
                >
                  <div v-if="isSavingProfile" i-eos-icons:three-dots-loading class="text-xl" />
                  <div v-else i-material-symbols-save-rounded class="text-lg" />
                  {{ isSavingProfile ? 'Saving profile' : 'Save profile' }}
                </button>
                <p class="text-[11px] leading-5 text-[var(--color-text)]/40">Changes are visible to the community.</p>
              </div>
            </form>

            <form
              class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5 sm:p-6"
              @submit.prevent="savePassword"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pink-300">Security</p>
                  <h2 class="mt-1 text-xl font-extrabold text-[var(--color-heading)]">Change password</h2>
                  <p class="mt-1 text-xs leading-5 text-[var(--color-text)]/50">
                    Use at least eight characters and keep it unique to Noxy.
                  </p>
                </div>
                <div
                  class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-pink-300/20 bg-pink-300/8 text-pink-300"
                >
                  <div i-material-symbols-lock-reset-rounded class="text-xl" />
                </div>
              </div>

              <div class="mt-6 grid gap-5 sm:grid-cols-2">
                <label class="block">
                  <span class="text-xs font-black text-[var(--color-heading)]">New password</span>
                  <div class="relative mt-2">
                    <input
                      v-model="password"
                      :type="isPasswordVisible ? 'text' : 'password'"
                      autocomplete="new-password"
                      required
                      minlength="8"
                      class="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/55 px-3 pr-11 text-sm font-medium text-[var(--color-heading)] outline-none focus:border-pink-300/55 focus:ring-2 focus:ring-pink-300/10"
                    />
                    <button
                      type="button"
                      class="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border-0 bg-transparent text-[var(--color-text)]/40 transition hover:bg-white/5 hover:text-pink-300"
                      :aria-label="isPasswordVisible ? 'Hide new password' : 'Show new password'"
                      @click="isPasswordVisible = !isPasswordVisible"
                    >
                      <div
                        :class="
                          isPasswordVisible
                            ? 'i-material-symbols-visibility-off-rounded'
                            : 'i-material-symbols-visibility-rounded'
                        "
                        class="text-lg"
                      />
                    </button>
                  </div>
                </label>

                <label class="block">
                  <span class="text-xs font-black text-[var(--color-heading)]">Confirm password</span>
                  <div class="relative mt-2">
                    <input
                      v-model="confirmPassword"
                      :type="isConfirmPasswordVisible ? 'text' : 'password'"
                      autocomplete="new-password"
                      required
                      minlength="8"
                      class="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/55 px-3 pr-11 text-sm font-medium text-[var(--color-heading)] outline-none focus:border-pink-300/55 focus:ring-2 focus:ring-pink-300/10"
                    />
                    <button
                      type="button"
                      class="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border-0 bg-transparent text-[var(--color-text)]/40 transition hover:bg-white/5 hover:text-pink-300"
                      :aria-label="isConfirmPasswordVisible ? 'Hide confirmed password' : 'Show confirmed password'"
                      @click="isConfirmPasswordVisible = !isConfirmPasswordVisible"
                    >
                      <div
                        :class="
                          isConfirmPasswordVisible
                            ? 'i-material-symbols-visibility-off-rounded'
                            : 'i-material-symbols-visibility-rounded'
                        "
                        class="text-lg"
                      />
                    </button>
                  </div>
                </label>
              </div>

              <div
                v-if="passwordMessage"
                class="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-300/20 bg-emerald-500/8 p-3 text-sm text-emerald-200"
                role="status"
              >
                <div i-material-symbols-check-circle-rounded class="mt-0.5 shrink-0 text-lg" />
                <p class="font-bold leading-5">{{ passwordMessage }}</p>
              </div>
              <div
                v-if="passwordError"
                class="mt-5 flex items-start gap-2.5 rounded-lg border border-red-300/20 bg-red-500/8 p-3 text-sm text-red-200"
                role="alert"
              >
                <div i-material-symbols-error-outline-rounded class="mt-0.5 shrink-0 text-lg" />
                <p class="font-bold leading-5">{{ passwordError }}</p>
              </div>

              <div class="mt-6 border-t border-[var(--color-border)] pt-5">
                <button
                  type="submit"
                  class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-0 bg-pink-300 px-5 text-sm font-black text-black transition hover:bg-pink-200 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isSavingPassword || !isConfigured"
                >
                  <div v-if="isSavingPassword" i-eos-icons:three-dots-loading class="text-xl" />
                  <div v-else i-material-symbols-lock-reset-rounded class="text-lg" />
                  {{ isSavingPassword ? 'Updating password' : 'Update password' }}
                </button>
              </div>
            </form>
          </div>

          <aside class="space-y-5 lg:sticky lg:top-24">
            <section class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-pink-300">Profile image</p>
                  <h2 class="mt-1 text-lg font-extrabold text-[var(--color-heading)]">Picture preview</h2>
                </div>
                <div i-material-symbols-image-rounded class="text-2xl text-pink-300" />
              </div>

              <div class="mt-6 grid place-items-center text-center">
                <div class="relative">
                  <img
                    v-if="avatarPreview"
                    :src="avatarPreview"
                    :alt="displayName"
                    class="h-28 w-28 rounded-full object-cover ring-2 ring-pink-300/65 ring-offset-4 ring-offset-[var(--color-background-soft)]"
                  />
                  <div
                    v-else
                    class="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-pink-200 to-pink-400 text-4xl font-black text-black ring-2 ring-pink-300/30 ring-offset-4 ring-offset-[var(--color-background-soft)]"
                  >
                    {{ accountInitial }}
                  </div>
                  <div
                    class="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-4 border-[var(--color-background-soft)] bg-[var(--color-background-mute)] text-pink-300"
                  >
                    <div i-material-symbols-photo-camera-rounded class="text-base" />
                  </div>
                </div>
                <p class="mt-5 max-w-full truncate text-sm font-black text-[var(--color-heading)]">{{ displayName }}</p>
                <p class="mt-1 max-w-full truncate text-[11px] text-[var(--color-text)]/45">{{ accountEmail }}</p>
              </div>

              <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="uploadAvatar" />
              <button
                type="button"
                class="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-pink-300/20 bg-pink-300/8 px-4 text-sm font-black text-pink-200 transition hover:border-pink-300/40 hover:bg-pink-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isUploadingAvatar || !isConfigured"
                @click="openAvatarPicker"
              >
                <div v-if="isUploadingAvatar" i-eos-icons:three-dots-loading class="text-xl" />
                <div v-else i-material-symbols-upload-rounded class="text-lg" />
                {{ isUploadingAvatar ? 'Uploading picture' : 'Upload new picture' }}
              </button>
              <p class="mt-3 text-center text-[10px] leading-5 text-[var(--color-text)]/40">
                JPG, PNG, WEBP, or GIF. Maximum file size: 2 MB.
              </p>
            </section>

            <section class="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)]/55 p-5">
              <div class="flex items-center gap-3">
                <div
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-pink-300/20 bg-pink-300/8 text-pink-300"
                >
                  <div i-material-symbols-shield-person-rounded class="text-lg" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-extrabold text-[var(--color-heading)]">Account overview</p>
                  <p class="mt-0.5 text-[10px] text-[var(--color-text)]/40">Signed-in account</p>
                </div>
              </div>

              <dl class="mt-4 divide-y divide-[var(--color-border)]">
                <div class="py-3">
                  <dt class="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]/35">Email</dt>
                  <dd class="mt-1 truncate text-xs font-bold text-[var(--color-heading)]">{{ accountEmail }}</dd>
                </div>
                <div class="py-3">
                  <dt class="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]/35">
                    Public profile
                  </dt>
                  <dd class="mt-1 text-xs font-bold text-emerald-300">Active</dd>
                </div>
                <div class="py-3">
                  <dt class="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]/35">
                    Member since
                  </dt>
                  <dd class="mt-1 text-xs font-bold text-[var(--color-heading)]">
                    {{ formatMonthYear(accountCreatedAt) }}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </template>
    </div>
  </main>
</template>
