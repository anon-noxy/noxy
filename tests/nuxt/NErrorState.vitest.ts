import { mountSuspended } from '@nuxt/test-utils/runtime'
import { NErrorState } from '#components'
import { describe, expect, it } from 'vitest'

describe('NErrorState', () => {
  it('renders the default error state', async () => {
    const wrapper = await mountSuspended(NErrorState)

    expect(wrapper.text()).toContain('Error 404')
    expect(wrapper.text()).toContain('We could not find that page')
    expect(wrapper.text()).toContain('Go home')
    expect(wrapper.text()).toContain('Browse anime')
  })

  it('renders custom error copy', async () => {
    const wrapper = await mountSuspended(NErrorState, {
      props: {
        statusCode: 500,
        title: 'Something went wrong',
        message: 'Please try again soon.',
      },
    })

    expect(wrapper.text()).toContain('Error 500')
    expect(wrapper.text()).toContain('Something went wrong')
    expect(wrapper.text()).toContain('Please try again soon.')
  })
})
