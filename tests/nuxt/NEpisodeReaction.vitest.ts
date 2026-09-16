import { mountSuspended } from '@nuxt/test-utils/runtime'
import { NEpisodeReaction } from '#components'
import { describe, expect, it } from 'vitest'

describe('NEpisodeReaction', () => {
  it('shows the selected feeling and emits a new reaction', async () => {
    const wrapper = await mountSuspended(NEpisodeReaction, {
      props: {
        episode: 4,
        reaction: 'happy',
      },
    })

    expect(wrapper.text()).toContain('How did it make you feel?')
    const happyIcon = wrapper.get('button[aria-label="Happy reaction"] span')

    expect(happyIcon.classes()).toContain('i-line-md-emoji-grin-filled')
    expect(happyIcon.attributes('style')).toContain('color: #f9e2af')
    expect(wrapper.get('button[aria-label="Happy reaction"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button[aria-label="Sad reaction"]').attributes('aria-pressed')).toBe('false')

    await wrapper.get('button[aria-label="Sad reaction"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['sad']])
  })
})
