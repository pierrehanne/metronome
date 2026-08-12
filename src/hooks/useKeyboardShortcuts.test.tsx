import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { useSettingsStore } from '../store/settingsStore'
import { BPM_DEFAULT } from '../types/metronome'

function Harness({ onToggle, onTap }: { onToggle: () => void; onTap: () => void }) {
  useKeyboardShortcuts({ onToggle, onTap })
  return (
    <div>
      <input aria-label="text field" type="text" />
      <textarea aria-label="notes" />
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  useSettingsStore.setState({
    bpm: BPM_DEFAULT,
    muted: false,
    shortcutsEnabled: true,
    isPlaying: false,
  })
})

describe('useKeyboardShortcuts', () => {
  it('starts and stops on Space', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<Harness onToggle={onToggle} onTap={vi.fn()} />)

    await user.keyboard(' ')
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('adjusts tempo with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<Harness onToggle={vi.fn()} onTap={vi.fn()} />)

    await user.keyboard('{ArrowUp}')
    expect(useSettingsStore.getState().bpm).toBe(BPM_DEFAULT + 1)

    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(useSettingsStore.getState().bpm).toBe(BPM_DEFAULT - 1)
  })

  it('jumps by five with Shift held', async () => {
    const user = userEvent.setup()
    render(<Harness onToggle={vi.fn()} onTap={vi.fn()} />)

    await user.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(useSettingsStore.getState().bpm).toBe(BPM_DEFAULT + 5)
  })

  it('taps on T', async () => {
    const onTap = vi.fn()
    const user = userEvent.setup()
    render(<Harness onToggle={vi.fn()} onTap={onTap} />)

    await user.keyboard('t')
    expect(onTap).toHaveBeenCalledTimes(1)

    // Case does not matter.
    await user.keyboard('T')
    expect(onTap).toHaveBeenCalledTimes(2)
  })

  it('mutes on M and resets tempo on R', async () => {
    const user = userEvent.setup()
    render(<Harness onToggle={vi.fn()} onTap={vi.fn()} />)

    await user.keyboard('m')
    expect(useSettingsStore.getState().muted).toBe(true)

    useSettingsStore.setState({ bpm: 200 })
    await user.keyboard('r')
    expect(useSettingsStore.getState().bpm).toBe(BPM_DEFAULT)
  })

  it('stays out of the way while typing in a text field', async () => {
    const onToggle = vi.fn()
    const onTap = vi.fn()
    const user = userEvent.setup()
    render(<Harness onToggle={onToggle} onTap={onTap} />)

    await user.click(screen.getByLabelText('text field'))
    await user.keyboard('tempo test')

    expect(onToggle).not.toHaveBeenCalled()
    expect(onTap).not.toHaveBeenCalled()
    expect(useSettingsStore.getState().bpm).toBe(BPM_DEFAULT)
  })

  it('stays out of the way inside a textarea', async () => {
    const onTap = vi.fn()
    const user = userEvent.setup()
    render(<Harness onToggle={vi.fn()} onTap={onTap} />)

    await user.click(screen.getByLabelText('notes'))
    await user.keyboard('rt m')

    expect(onTap).not.toHaveBeenCalled()
    expect(useSettingsStore.getState().muted).toBe(false)
  })

  it('ignores shortcuts modified with Meta or Control', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<Harness onToggle={onToggle} onTap={vi.fn()} />)

    await user.keyboard('{Control>} {/Control}')
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('does nothing when shortcuts are turned off', async () => {
    useSettingsStore.setState({ shortcutsEnabled: false })
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<Harness onToggle={onToggle} onTap={vi.fn()} />)

    await user.keyboard(' {ArrowUp}t')

    expect(onToggle).not.toHaveBeenCalled()
    expect(useSettingsStore.getState().bpm).toBe(BPM_DEFAULT)
  })
})
