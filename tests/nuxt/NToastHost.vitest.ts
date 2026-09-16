import { mountSuspended } from '@nuxt/test-utils/runtime'
import { NToastHost } from '#components'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { useUserPreferencesStore } from '../../app/stores/userPreferences'

describe('NToastHost', () => {
  it('renders store toasts and removes them from the close button', async () => {
    const store = useUserPreferencesStore()

    store.toasts = [
      { id: 1, message: 'Saved to watchlist', tone: 'success' },
      { id: 2, message: 'Unable to save anime', tone: 'error' },
    ]

    await mountSuspended(NToastHost)
    await nextTick()

    expect(document.body.textContent).toContain('Saved to watchlist')
    expect(document.body.textContent).toContain('Unable to save anime')

    document.body.querySelector<HTMLButtonElement>('button[aria-label="Close notification"]')?.click()
    await nextTick()

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0]?.message).toBe('Unable to save anime')
  })
})
