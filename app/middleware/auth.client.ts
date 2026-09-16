export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useSupabaseAuth()
  const { openAuthModal } = useAuthModal()

  await auth.ready()

  if (auth.isAuthenticated.value) return

  openAuthModal('login', to.fullPath)

  return navigateTo({
    path: '/home',
    query: {
      auth: 'login',
      redirect: to.fullPath,
    },
  })
})
