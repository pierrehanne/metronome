import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BPMDisplay } from './BPMDisplay'
import { BPM_MAX } from '../types/metronome'

describe('BPMDisplay', () => {
  it('shows the current tempo and its marking', () => {
    render(<BPMDisplay bpm={120} onChange={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: /120 beats per minute/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Moderato')).toBeInTheDocument()
  })

  it('shows one decimal place after fine adjustment', () => {
    render(<BPMDisplay bpm={120.5} onChange={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: /120\.5 beats per minute/i }),
    ).toBeInTheDocument()
  })

  it('accepts a typed tempo', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<BPMDisplay bpm={120} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /beats per minute/i }))
    const input = screen.getByRole('spinbutton', { name: /tempo in beats per minute/i })
    await user.clear(input)
    await user.type(input, '96{Enter}')

    expect(onChange).toHaveBeenCalledWith(96)
  })

  it('clamps a typed tempo above the maximum', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<BPMDisplay bpm={120} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /beats per minute/i }))
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '9999{Enter}')

    expect(onChange).toHaveBeenCalledWith(BPM_MAX)
  })

  it('discards the edit on Escape', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<BPMDisplay bpm={120} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /beats per minute/i }))
    await user.type(screen.getByRole('spinbutton'), '75{Escape}')

    expect(onChange).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: /120 beats per minute/i }),
    ).toBeInTheDocument()
  })

  it('ignores a non-numeric entry', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<BPMDisplay bpm={120} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /beats per minute/i }))
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.tab()

    expect(onChange).not.toHaveBeenCalled()
  })
})
