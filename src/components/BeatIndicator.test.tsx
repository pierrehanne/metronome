import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BeatIndicator } from './BeatIndicator'
import { getTimeSignature } from '../utils/rhythm'

describe('BeatIndicator', () => {
  it('renders one dot per beat in the measure', () => {
    const { container } = render(
      <BeatIndicator
        signature={getTimeSignature('4/4')}
        currentBeat={null}
        accentEnabled
        animate
      />,
    )
    expect(container.querySelectorAll('span[aria-hidden]')).toHaveLength(4)
  })

  it('follows the time signature', () => {
    const { container } = render(
      <BeatIndicator
        signature={getTimeSignature('7/8')}
        currentBeat={null}
        accentEnabled
        animate
      />,
    )
    expect(container.querySelectorAll('span[aria-hidden]')).toHaveLength(7)
  })

  it('announces the current beat to assistive technology', () => {
    render(
      <BeatIndicator
        signature={getTimeSignature('4/4')}
        currentBeat={2}
        accentEnabled
        animate
      />,
    )
    expect(screen.getByRole('group')).toHaveAccessibleName('Beat 3 of 4')
  })

  it('reports being stopped when no beat is active', () => {
    render(
      <BeatIndicator
        signature={getTimeSignature('4/4')}
        currentBeat={null}
        accentEnabled
        animate
      />,
    )
    expect(screen.getByRole('group')).toHaveAccessibleName('Beat stopped of 4')
  })

  it('marks the active beat with more than colour', () => {
    const { container } = render(
      <BeatIndicator
        signature={getTimeSignature('4/4')}
        currentBeat={0}
        accentEnabled
        animate
      />,
    )
    const dots = container.querySelectorAll('span[aria-hidden]')
    // The active dot is scaled up as well as filled.
    expect(dots[0]!.className).toContain('scale-125')
    expect(dots[1]!.className).not.toContain('scale-125')
  })

  it('omits the transition when animation is disabled', () => {
    const { container } = render(
      <BeatIndicator
        signature={getTimeSignature('4/4')}
        currentBeat={1}
        accentEnabled
        animate={false}
      />,
    )
    for (const dot of container.querySelectorAll('span[aria-hidden]')) {
      expect(dot.className).not.toContain('transition-all')
    }
  })
})
