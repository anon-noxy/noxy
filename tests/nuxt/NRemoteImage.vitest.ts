import { mountSuspended } from '@nuxt/test-utils/runtime'
import { NRemoteImage } from '#components'
import { describe, expect, it } from 'vitest'

describe('NRemoteImage', () => {
  it('fades the Nuxt image in after it loads', async () => {
    const wrapper = await mountSuspended(NRemoteImage, {
      props: {
        src: '/cover.jpg',
        alt: 'Cover image',
      },
    })

    const image = wrapper.get('img[data-nuxt-img]')

    expect(image.attributes('src')).toBe('/cover.jpg')
    expect(image.attributes('src')).not.toContain('/_ipx/')
    expect(image.classes()).toContain('n-remote-image--loading')

    await image.trigger('load')

    expect(image.classes()).toContain('n-remote-image--loaded')
    expect(image.classes()).not.toContain('n-remote-image--loading')
  })

  it('renders the fallback slot after the Nuxt image fails', async () => {
    const wrapper = await mountSuspended(NRemoteImage, {
      props: {
        src: '/missing-cover.jpg',
        alt: 'Missing cover',
      },
      attrs: {
        class: 'aspect-[2/3]',
      },
      slots: {
        fallback: '<span data-test-id="fallback">No image</span>',
      },
    })

    await wrapper.get('img[data-nuxt-img]').trigger('error')

    expect(wrapper.find('[data-test-id="fallback"]').exists()).toBe(true)
    expect(wrapper.get('.aspect-\\[2\\/3\\]').attributes('aria-hidden')).toBeUndefined()
  })

  it('loads a fallback source when the primary image fails', async () => {
    const wrapper = await mountSuspended(NRemoteImage, {
      props: {
        src: '/missing-banner.jpg',
        fallbackSrc: '/cover.jpg',
        alt: 'Anime artwork',
      },
    })

    await wrapper.get('img[data-nuxt-img]').trigger('error')

    const fallbackImage = wrapper.get('img[data-nuxt-img]')

    expect(fallbackImage.attributes('src')).toBe('/cover.jpg')
    expect(wrapper.find('.n-remote-image-fallback').exists()).toBe(false)

    await fallbackImage.trigger('error')

    expect(wrapper.find('img[data-nuxt-img]').exists()).toBe(false)
    expect(wrapper.get('.n-remote-image-fallback').attributes('aria-label')).toBe('Anime artwork')
  })

  it('renders a default fallback with the placeholder color after image failure', async () => {
    const wrapper = await mountSuspended(NRemoteImage, {
      props: {
        src: '/missing-cover.jpg',
        alt: 'Missing cover',
        placeholderColor: '#f5a623',
      },
    })

    await wrapper.get('img[data-nuxt-img]').trigger('error')

    const fallback = wrapper.get('.n-remote-image-fallback')

    expect(fallback.attributes('role')).toBe('img')
    expect(fallback.attributes('aria-label')).toBe('Missing cover')
    expect(fallback.attributes('style')).toContain('--n-remote-image-placeholder-color: #f5a623')
    expect(fallback.find('[i-material-symbols-image-not-supported-outline]').exists()).toBe(true)
  })
})
