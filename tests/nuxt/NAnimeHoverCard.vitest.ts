import { mountSuspended } from '@nuxt/test-utils/runtime'
import { NAnimeHoverCard } from '#components'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('NAnimeHoverCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    vi.stubGlobal('useAnnouncer', () => ({ polite: vi.fn() }))
  })

  it('loads and displays hover details after the hover delay', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      id: 501,
      title: {
        english: 'Hover Anime',
        romaji: 'Hover Romaji',
      },
      description: '<p>A useful description.</p>',
      format: 'TV',
      status: 'FINISHED',
      episodes: 12,
      duration: 24,
      season: 'SPRING',
      seasonYear: 2024,
      averageScore: 86,
      genres: ['Adventure', 'Fantasy'],
      synonyms: ['Other Name'],
      coverImage: {
        large: '/hover.jpg',
      },
      studios: {
        nodes: [{ id: 1, name: 'Studio Test' }],
      },
    })

    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountSuspended(NAnimeHoverCard, {
      props: {
        animeId: 501,
      },
      slots: {
        default: '<button type="button">Hover target</button>',
      },
    })

    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 20,
      y: 20,
      top: 20,
      left: 20,
      right: 120,
      bottom: 120,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    })

    await wrapper.get('.min-w-0').trigger('pointerenter')
    await vi.advanceTimersByTimeAsync(450)
    await wrapper.vm.$nextTick()

    expect(fetchMock).toHaveBeenCalledWith('/api/myanimelist/hover/501')
    expect(document.body.textContent).toContain('Hover Anime')
    expect(document.body.textContent).toContain('A useful description.')
    expect(document.body.textContent).toContain('Studio Test')
  })

  it('does not open on devices without fine hover support', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    const fetchMock = vi.fn()

    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountSuspended(NAnimeHoverCard, {
      props: {
        animeId: 502,
      },
      slots: {
        default: '<button type="button">Hover target</button>',
      },
    })

    await wrapper.get('.min-w-0').trigger('pointerenter')
    await vi.advanceTimersByTimeAsync(450)

    expect(document.body.textContent).not.toContain('Loading...')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
