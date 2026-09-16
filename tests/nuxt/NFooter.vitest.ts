import { mountSuspended } from '@nuxt/test-utils/runtime'
import { NFooter } from '#components'
import { describe, expect, it } from 'vitest'

describe('NFooter', () => {
  it('renders primary footer navigation and copy', async () => {
    const wrapper = await mountSuspended(NFooter)

    expect(wrapper.text()).toContain('A - Z List')
    expect(wrapper.text()).toContain('Searching anime order by alphabet name A to Z.')
    expect(wrapper.text()).toContain('Terms of service')
    expect(wrapper.text()).toContain('DMCA')
    expect(wrapper.text()).toContain('Contact')
    expect(wrapper.text()).toContain('Noxy does not store any files on our server')
  })

  it('renders alphabet links', async () => {
    const wrapper = await mountSuspended(NFooter)
    const links = wrapper.findAll('a')

    expect(links.some((link) => link.text() === 'All' && link.attributes('href') === '/az/all')).toBe(true)
    expect(links.some((link) => link.text() === 'A' && link.attributes('href') === '/az/a')).toBe(true)
    expect(links.some((link) => link.text() === 'Z' && link.attributes('href') === '/az/z')).toBe(true)
  })

  it('links Discord to the invite', async () => {
    const wrapper = await mountSuspended(NFooter)
    const discordLink = wrapper.find('a[aria-label="Join Discord"]')

    expect(discordLink.exists()).toBe(true)
    expect(discordLink.attributes('href')).toBe('https://discord.gg/Nsx8WNNCk')
  })
})
