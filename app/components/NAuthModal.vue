<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { authModalMode, authRedirectTo, closeAuthModal, isAuthModalOpen, openAuthModal, setAuthModalMode } =
  useAuthModal()
const { isAuthenticated, isConfigured, isReady, resendVerification, signIn, signUp } = useSupabaseAuth()

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const registeredEmail = ref('')
const isSubmitting = ref(false)
const isResending = ref(false)
const message = ref('')
const errorMessage = ref('')
const isBodyScrollLocked = useScrollLock(import.meta.client ? document.body : null)

const isLoginMode = computed(() => authModalMode.value === 'login')
const title = computed(() => (isLoginMode.value ? 'Login' : 'Register'))
const subtitle = computed(() => (isLoginMode.value ? 'Access your watchlist.' : 'Create your Noxy account.'))
const submitLabel = computed(() => (isLoginMode.value ? 'Sign in' : 'Create account'))

const safeRedirect = (path?: string | null) => {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/home'

  return path
}

const routeRedirect = () => {
  const redirect = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect

  return safeRedirect(typeof redirect === 'string' ? redirect : authRedirectTo.value)
}

const toErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error && error.message ? error.message : fallback
}

const clearFormFeedback = () => {
  message.value = ''
  errorMessage.value = ''
}

const switchMode = (mode: 'login' | 'register') => {
  setAuthModalMode(mode)
  clearFormFeedback()
}

const cleanAuthQuery = async () => {
  if (!route.query.auth && !route.query.verified && !route.query.redirect) return

  const nextQuery = { ...route.query }
  delete nextQuery.auth
  delete nextQuery.verified
  delete nextQuery.redirect

  await router.replace({
    path: route.path,
    query: nextQuery,
  })
}

const dismiss = () => {
  closeAuthModal()
  void cleanAuthQuery()
}

const completeAuth = async () => {
  const redirectTo = safeRedirect(authRedirectTo.value || routeRedirect())

  closeAuthModal()
  await router.replace(redirectTo)
}

const submit = async () => {
  clearFormFeedback()
  isSubmitting.value = true

  try {
    if (isLoginMode.value) {
      await signIn({
        email: email.value,
        password: password.value,
      })
      await completeAuth()
      return
    }

    const data = await signUp({
      username: username.value,
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    })

    registeredEmail.value = email.value.trim().toLowerCase()
    password.value = ''
    confirmPassword.value = ''

    if (data.session) {
      await completeAuth()
      return
    }

    setAuthModalMode('login')
    message.value = 'Verification email sent. Open the link in your inbox, then sign in.'
  } catch (error) {
    errorMessage.value = toErrorMessage(error, isLoginMode.value ? 'Unable to sign in.' : 'Unable to create account.')
  } finally {
    isSubmitting.value = false
  }
}

const resend = async () => {
  clearFormFeedback()
  isResending.value = true

  try {
    await resendVerification(registeredEmail.value || email.value)
    message.value = 'Verification email sent. Check your inbox to finish signup.'
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to resend verification email.')
  } finally {
    isResending.value = false
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isAuthModalOpen.value) {
    dismiss()
  }
}

watch(
  () => [route.query.auth, route.query.redirect, route.query.verified],
  ([authQuery, redirectQuery, verified]) => {
    const requestedMode = authQuery === 'register' ? 'register' : authQuery === 'login' ? 'login' : null

    if (!requestedMode) return

    const redirect = Array.isArray(redirectQuery) ? redirectQuery[0] : redirectQuery

    openAuthModal(requestedMode, typeof redirect === 'string' ? redirect : undefined)

    if (verified === '1') {
      message.value = 'Email verified. You can sign in now.'
      errorMessage.value = ''
    }
  },
  { immediate: true },
)

watch(
  [isReady, isAuthenticated],
  ([ready, authenticated]) => {
    if (ready && authenticated && isAuthModalOpen.value) {
      void completeAuth()
    }
  },
  { immediate: true },
)

watch(
  isAuthModalOpen,
  (isOpen) => {
    isBodyScrollLocked.value = isOpen

    if (!isOpen) {
      clearFormFeedback()
      password.value = ''
      confirmPassword.value = ''
    }
  },
  { immediate: true },
)

useEventListener(import.meta.client ? document : null, 'keydown', handleKeydown)

onBeforeUnmount(() => {
  isBodyScrollLocked.value = false
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isAuthModalOpen"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`auth-modal-title`"
        @mousedown.self="dismiss"
      >
        <div class="w-full max-w-md rounded bg-[var(--color-background-soft)] p-6 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 items-center gap-3">
              <div class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink-300 text-black">
                <div
                  :class="isLoginMode ? 'i-material-symbols-person-rounded' : 'i-material-symbols-person-add-rounded'"
                  class="text-3xl"
                />
              </div>
              <div class="min-w-0">
                <h2 id="auth-modal-title" class="text-2xl font-extrabold text-[var(--color-heading)]">
                  {{ title }}
                </h2>
                <p class="mt-1 text-sm text-[var(--color-text)]/65">{{ subtitle }}</p>
              </div>
            </div>

            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border-0 bg-transparent p-0 text-[var(--color-heading)] transition hover:bg-[var(--color-background-mute)] hover:text-pink-300"
              aria-label="Close auth modal"
              @click="dismiss"
            >
              <div i-material-symbols-close-rounded class="text-2xl" />
            </button>
          </div>

          <div class="mt-6 grid grid-cols-2 overflow-hidden rounded bg-[var(--color-background-mute)] p-1">
            <button
              type="button"
              class="h-9 rounded border-0 text-sm font-black transition"
              :class="
                isLoginMode
                  ? 'bg-pink-300 text-black'
                  : 'bg-transparent text-[var(--color-heading)] hover:text-pink-300'
              "
              @click="switchMode('login')"
            >
              Login
            </button>
            <button
              type="button"
              class="h-9 rounded border-0 text-sm font-black transition"
              :class="
                !isLoginMode
                  ? 'bg-pink-300 text-black'
                  : 'bg-transparent text-[var(--color-heading)] hover:text-pink-300'
              "
              @click="switchMode('register')"
            >
              Register
            </button>
          </div>

          <div v-if="!isConfigured" class="mt-5 rounded bg-red-500/10 p-3 text-sm font-semibold text-red-300">
            Supabase is not configured. Add your public Supabase URL and anon key to the environment.
          </div>

          <form class="mt-5 space-y-4" @submit.prevent="submit">
            <label v-if="!isLoginMode" class="block">
              <span class="text-sm font-bold text-[var(--color-heading)]">Username</span>
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                required
                minlength="3"
                maxlength="24"
                pattern="[A-Za-z0-9_]{3,24}"
                class="mt-2 h-11 w-full rounded border-0 bg-white px-3 text-sm font-medium text-black outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-pink-300"
                placeholder="noxy_fan"
              />
            </label>

            <label class="block">
              <span class="text-sm font-bold text-[var(--color-heading)]">Email</span>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                required
                class="mt-2 h-11 w-full rounded border-0 bg-white px-3 text-sm font-medium text-black outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-pink-300"
                placeholder="you@example.com"
              />
            </label>

            <label class="block">
              <span class="text-sm font-bold text-[var(--color-heading)]">Password</span>
              <input
                v-model="password"
                type="password"
                :autocomplete="isLoginMode ? 'current-password' : 'new-password'"
                required
                :minlength="isLoginMode ? undefined : 8"
                class="mt-2 h-11 w-full rounded border-0 bg-white px-3 text-sm font-medium text-black outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-pink-300"
                :placeholder="isLoginMode ? 'Your password' : 'At least 8 characters'"
              />
            </label>

            <label v-if="!isLoginMode" class="block">
              <span class="text-sm font-bold text-[var(--color-heading)]">Confirm Password</span>
              <input
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                minlength="8"
                class="mt-2 h-11 w-full rounded border-0 bg-white px-3 text-sm font-medium text-black outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-pink-300"
                placeholder="Repeat password"
              />
            </label>

            <p v-if="message" class="rounded bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">
              {{ message }}
            </p>
            <p v-if="errorMessage" class="rounded bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              {{ errorMessage }}
            </p>

            <button
              type="submit"
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded border-0 bg-pink-300 px-4 text-sm font-black text-black transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isSubmitting || !isConfigured"
            >
              <div v-if="isSubmitting" i-eos-icons:three-dots-loading class="text-xl" />
              <div
                v-else
                :class="isLoginMode ? 'i-material-symbols-login-rounded' : 'i-material-symbols-person-add-rounded'"
                class="text-xl"
              />
              {{ submitLabel }}
            </button>
          </form>

          <button
            type="button"
            class="mt-4 w-full border-0 bg-transparent p-0 font-lexend text-sm font-bold text-pink-300 transition hover:text-pink-200"
            @click="switchMode(isLoginMode ? 'register' : 'login')"
          >
            {{ isLoginMode ? 'Create account' : 'Already have an account?' }}
          </button>

          <button
            type="button"
            class="mt-3 w-full border-0 bg-transparent p-0 font-lexend text-sm font-bold text-[var(--color-text)]/70 transition hover:text-pink-300 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isResending || !isConfigured"
            @click="resend"
          >
            Resend verification email
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
