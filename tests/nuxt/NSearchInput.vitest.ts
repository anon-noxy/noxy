import { mountSuspended } from '@nuxt/test-utils/runtime'
import { NSearchInput } from '#components'
import { describe, expect, it, vi } from 'vitest'

describe('NSearchInput', () => {
  it('renders custom labeling and clears the current query', async () => {
    const wrapper = await mountSuspended(NSearchInput, {
      props: {
        id: 'anime-search',
        label: 'Find anime',
        placeholder: 'Type anime title',
        modelValue: 'frieren',
        'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
      },
    })

    expect(wrapper.get('label').attributes('for')).toBe('anime-search')
    expect(wrapper.get('label').text()).toBe('Find anime')
    expect(wrapper.get('input').attributes('placeholder')).toBe('Type anime title')

    await wrapper.get('button[aria-label="Clear search"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
  })

  it('loads matching search results after typing a query', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn().mockResolvedValue([
      {
        id: 1,
        title: 'Frieren: Beyond Journey’s End',
        romajiTitle: 'Sousou no Frieren',
        type: 'TV',
        episodes: 28,
        year: 2023,
        image: '/frieren.jpg',
      },
    ])

    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountSuspended(NSearchInput)
    const input = wrapper.get('input')

    await input.trigger('focus')
    await input.setValue('frieren')
    await vi.advanceTimersByTimeAsync(300)

    expect(fetchMock).toHaveBeenCalledWith('/api/myanimelist/search', {
      query: {
        q: 'frieren',
      },
    })
    expect(wrapper.text()).toContain('Frieren: Beyond Journey’s End')
    expect(wrapper.text()).toContain('28 eps')

    vi.useRealTimers()
  })
})
