import type { AuthResponse, Session, SupabaseClient, User } from '@supabase/supabase-js'

export type AuthProfile = {
  id: string
  username: string
  email: string
  bio: string
  avatar_url: string
  created_at: string
  updated_at: string
}

type SignInPayload = {
  email: string
  password: string
}

type SignUpPayload = SignInPayload & {
  username: string
  confirmPassword: string
}

type UpdateProfilePayload = {
  username: string
  bio: string
  avatarUrl: string
}

type UpdatePasswordPayload = {
  password: string
  confirmPassword: string
}

const usernamePattern = /^[a-z0-9_]{3,24}$/
let authInitPromise: Promise<void> | null = null
let authSubscription: { unsubscribe: () => void } | null = null
let activeProfileRequestId = 0

const normalizeUsername = (value: string) => value.trim().toLowerCase()
const profileSelect = 'id, username, email, bio, avatar_url, created_at, updated_at'

const getErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') => {
  return error instanceof Error && error.message ? error.message : fallback
}

export const useSupabaseAuth = () => {
  const nuxtApp = useNuxtApp()
  const config = useRuntimeConfig()
  const supabase = (nuxtApp.$supabase || null) as SupabaseClient | null
  const session = useState<Session | null>('noxy-auth-session', () => null)
  const user = useState<User | null>('noxy-auth-user', () => null)
  const profile = useState<AuthProfile | null>('noxy-auth-profile', () => null)
  const isReady = useState('noxy-auth-ready', () => false)
  const lastError = useState('noxy-auth-error', () => '')

  const isConfigured = computed(() => Boolean(supabase))
  const isAuthenticated = computed(() => Boolean(user.value || session.value?.user))
  const displayName = computed(() => {
    const metadataUsername = normalizeUsername(String(user.value?.user_metadata?.username || ''))

    return profile.value?.username || metadataUsername || user.value?.email?.split('@')[0] || 'Account'
  })

  const emailRedirectTo = () => {
    const configuredRedirect = String(config.public.supabaseEmailRedirectTo || '')

    if (configuredRedirect) return configuredRedirect

    return import.meta.client ? `${window.location.origin}/home?auth=login&verified=1` : undefined
  }

  const ensureConfigured = () => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Add NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY.')
    }

    return supabase
  }

  const loadProfile = async (authUser: User | null) => {
    if (!supabase || !authUser) {
      profile.value = null
      return
    }

    const requestId = ++activeProfileRequestId
    const { data, error } = await supabase.from('profiles').select(profileSelect).eq('id', authUser.id).maybeSingle()

    if (requestId !== activeProfileRequestId) return

    if (error) {
      console.error('Profile load error:', error)
      profile.value = null
      return
    }

    profile.value = data as AuthProfile | null
  }

  const setAuthSession = async (nextSession: Session | null) => {
    session.value = nextSession
    user.value = nextSession?.user || null

    if (user.value) {
      await loadProfile(user.value)
    } else {
      activeProfileRequestId += 1
      profile.value = null
    }

    isReady.value = true
  }

  const ready = () => {
    if (!import.meta.client) return Promise.resolve()

    if (!supabase) {
      isReady.value = true
      return Promise.resolve()
    }

    if (!authInitPromise) {
      authInitPromise = supabase.auth
        .getSession()
        .then(async ({ data, error }) => {
          if (error) throw error

          await setAuthSession(data.session)
        })
        .catch((error) => {
          lastError.value = getErrorMessage(error, 'Unable to restore your session.')
          console.error('Auth session error:', error)
          isReady.value = true
        })
    }

    if (!authSubscription) {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        void setAuthSession(nextSession)
      })

      authSubscription = data.subscription
    }

    return authInitPromise
  }

  const signIn = async (payload: SignInPayload) => {
    const client = ensureConfigured()
    const email = payload.email.trim().toLowerCase()

    if (!email || !payload.password) {
      throw new Error('Email and password are required.')
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: payload.password,
    })

    if (error) throw error

    await setAuthSession(data.session)
    return data
  }

  const signUp = async (payload: SignUpPayload): Promise<AuthResponse['data']> => {
    const client = ensureConfigured()
    const username = normalizeUsername(payload.username)
    const email = payload.email.trim().toLowerCase()

    if (!usernamePattern.test(username)) {
      throw new Error('Username must be 3-24 characters and use only lowercase letters, numbers, or underscores.')
    }

    if (!email || !payload.password || !payload.confirmPassword) {
      throw new Error('Username, email, password, and confirm password are required.')
    }

    if (payload.password.length < 8) {
      throw new Error('Password must be at least 8 characters.')
    }

    if (payload.password !== payload.confirmPassword) {
      throw new Error('Passwords do not match.')
    }

    const { data, error } = await client.auth.signUp({
      email,
      password: payload.password,
      options: {
        data: {
          username,
        },
        emailRedirectTo: emailRedirectTo(),
      },
    })

    if (error) throw error

    if (data.session) {
      await setAuthSession(data.session)
    }

    return data
  }

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const client = ensureConfigured()
    const userId = user.value?.id
    const username = normalizeUsername(payload.username)
    const bio = payload.bio.trim().slice(0, 240)
    const avatarUrl = payload.avatarUrl.trim()

    if (!userId) {
      throw new Error('Sign in to update your profile.')
    }

    if (!usernamePattern.test(username)) {
      throw new Error('Username must be 3-24 characters and use only lowercase letters, numbers, or underscores.')
    }

    if (avatarUrl) {
      try {
        const parsedUrl = new URL(avatarUrl)

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error()
        }
      } catch {
        throw new Error('Profile picture must be a valid image URL.')
      }
    }

    const { data, error } = await client
      .from('profiles')
      .update({
        username,
        bio,
        avatar_url: avatarUrl,
      })
      .eq('id', userId)
      .select(profileSelect)
      .single()

    if (error) throw error

    profile.value = data as AuthProfile

    await client.auth.updateUser({
      data: {
        username,
        avatar_url: avatarUrl,
      },
    })

    return profile.value
  }

  const updatePassword = async (payload: UpdatePasswordPayload) => {
    const client = ensureConfigured()

    if (payload.password.length < 8) {
      throw new Error('Password must be at least 8 characters.')
    }

    if (payload.password !== payload.confirmPassword) {
      throw new Error('Passwords do not match.')
    }

    const { error } = await client.auth.updateUser({
      password: payload.password,
    })

    if (error) throw error
  }

  const resendVerification = async (email: string) => {
    const client = ensureConfigured()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      throw new Error('Email is required.')
    }

    const { error } = await client.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: emailRedirectTo(),
      },
    })

    if (error) throw error
  }

  const signOut = async () => {
    const client = ensureConfigured()
    const { error } = await client.auth.signOut()

    if (error) throw error

    await setAuthSession(null)
  }

  void ready()

  return {
    supabase,
    session,
    user,
    profile,
    isReady,
    isConfigured,
    isAuthenticated,
    displayName,
    lastError,
    ready,
    signIn,
    signUp,
    updateProfile,
    updatePassword,
    resendVerification,
    signOut,
  }
}
