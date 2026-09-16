import { useState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { NHeader } from '#components'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useUserPreferencesStore } from '../../app/stores/userPreferences'

const authenticate = () => {
  const user = {
    id: 'user-1',
    email: 'fan@example.com',
    user_metadata: {
      username: 'fan',
    },
  }

  useState<unknown | null>('noxy-auth-user', () => null).value = user
  useState<unknown | null>('noxy-auth-session', () => null).value = { user }
  useState('noxy-auth-ready', () => false).value = true
}

describe('NHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    useState<unknown | null>('noxy-auth-user', () => null).value = null
    useState<unknown | null>('noxy-auth-session', () => null).value = null
    useState<unknown | null>('noxy-auth-profile', () => null).value = null
    useState('noxy-auth-ready', () => false).value = true
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))
  })

  it('opens and closes the navigation drawer without removed category entries', async () => {
    const wrapper = await mountSuspended(NHeader)
    const menuButton = wrapper.get('button[aria-label="Open navigation menu"]')

    expect(menuButton.classes()).not.toContain('hidden')
    expect(menuButton.classes()).not.toContain('xl:hidden')

    await menuButton.trigger('click')

    expect(menuButton.attributes('aria-expanded')).toBe('true')
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.textContent).toContain('Close menu')
    expect(document.body.textContent).toContain('Latest Added')
    expect(document.body.textContent).toContain('Community')
    expect(document.body.textContent).toContain('Genre')
    expect(document.body.textContent).toContain('Action')
    expect(document.body.textContent).toContain('Adventure')
    expect(document.body.textContent).toContain('Adult Cast')
    expect(document.body.textContent).not.toContain('Ecchi')
    expect(document.body.textContent).not.toContain('Video Game')

    const moreGenresButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === '+More',
    )

    moreGenresButton?.click()
    await wrapper.vm.$nextTick()

    expect(document.body.textContent).toContain('Ecchi')
    expect(document.body.textContent).toContain('Video Game')
    expect(document.body.textContent).toContain('Less')

    const menuNavigation = document.body.querySelector('[aria-label="Menu navigation"]')

    expect(menuNavigation?.textContent).not.toContain('Activity')
    expect(menuNavigation?.textContent).not.toContain('Settings')
    expect(menuNavigation?.textContent).not.toContain('Music')
    expect(menuNavigation?.textContent).not.toContain('ONA')

    document.body.querySelector<HTMLButtonElement>('aside button')?.click()
    await wrapper.vm.$nextTick()

    expect(menuButton.attributes('aria-expanded')).toBe('false')
    expect(document.body.style.overflow).toBe('')
  })

  it('does not render removed watch2gether and login entry points', async () => {
    const wrapper = await mountSuspended(NHeader)

    expect(wrapper.find('button[aria-controls="login-modal"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Login')
    expect(wrapper.text()).not.toContain('Watch2gether')
    expect(wrapper.text()).not.toContain('W.2.G')
  })

  it('shows watchlist count and calls the provided language toggle', async () => {
    authenticate()
    const selectedLanguage = ref('EN')
    const toggleLanguage = vi.fn((language: string) => {
      selectedLanguage.value = language
    })
    const wrapper = await mountSuspended(NHeader, {
      global: {
        provide: {
          selectedLanguage,
          toggleLanguage,
        },
      },
    })
    const store = useUserPreferencesStore()

    store.toggleWatchlist({ id: 1, title: 'Saved Anime', image: '/saved.jpg' })
    await wrapper.vm.$nextTick()

    expect(wrapper.get('a[aria-label="Watchlist"]').text()).toContain('1')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'JP')
      ?.trigger('click')

    expect(toggleLanguage).toHaveBeenCalledWith('RO')
    expect(selectedLanguage.value).toBe('RO')
  })

  it('loads search results after typing and navigates through filter submit', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/myanimelist/search') {
        return Promise.resolve([
          {
            id: 7,
            title: 'Frieren: Beyond Journey’s End',
            romajiTitle: 'Sousou no Frieren',
            type: 'TV',
            episodes: 28,
            year: 2023,
            image: '/frieren.jpg',
          },
        ])
      }

      return Promise.resolve([])
    })

    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountSuspended(NHeader)
    const input = wrapper.get('input[placeholder="Search anime titles..."]')

    await input.trigger('focus')
    await input.setValue('frieren')
    await vi.advanceTimersByTimeAsync(300)
    await wrapper.vm.$nextTick()

    expect(fetchMock).toHaveBeenCalledWith('/api/myanimelist/search', {
      query: {
        q: 'frieren',
      },
    })
    expect(wrapper.text()).toContain('Frieren: Beyond Journey’s End')

    await wrapper.get('.search-container button[aria-label="Open anime filters"]').trigger('click')

    expect(useUserPreferencesStore().recentSearches).toContain('frieren')
  })

  it('clears the navbar search without opening the filter page', async () => {
    const wrapper = await mountSuspended(NHeader)
    const input = wrapper.get('input[placeholder="Search anime titles..."]')

    await input.setValue('frieren')
    await wrapper.get('.search-container button[aria-label="Clear navbar search"]').trigger('click')

    expect((input.element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('.search-container button[aria-label="Clear navbar search"]').exists()).toBe(false)
  })
})
