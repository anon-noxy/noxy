export type AuthModalMode = 'login' | 'register'

const safeRedirectPath = (path?: string | null) => {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return ''

  return path
}

export const useAuthModal = () => {
  const isAuthModalOpen = useState('noxy-auth-modal-open', () => false)
  const authModalMode = useState<AuthModalMode>('noxy-auth-modal-mode', () => 'login')
  const authRedirectTo = useState('noxy-auth-modal-redirect-to', () => '')

  const setAuthModalMode = (mode: AuthModalMode) => {
    authModalMode.value = mode
  }

  const openAuthModal = (mode: AuthModalMode = 'login', redirectTo?: string | null) => {
    authModalMode.value = mode
    authRedirectTo.value = safeRedirectPath(redirectTo)
    isAuthModalOpen.value = true
  }

  const closeAuthModal = () => {
    isAuthModalOpen.value = false
  }

  return {
    isAuthModalOpen,
    authModalMode,
    authRedirectTo,
    setAuthModalMode,
    openAuthModal,
    closeAuthModal,
  }
}
