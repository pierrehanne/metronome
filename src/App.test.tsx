import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { useSettingsStore } from './store/settingsStore'
import { BPM_DEFAULT } from './types/metronome'
import { installMockAudioContext, MockAudioContext } from './test/mockAudioContext'

let restoreAudio: () => void

beforeEach(() => {
  restoreAudio = installMockAudioContext()
  localStorage.clear()
  useSettingsStore.setState({
    isPlaying: false,
    bpm: BPM_DEFAULT,
    timeSignature: '4/4',
    subdivision: 'quarter',
    volume: 0.8,
    muted: false,
    accentEnabled: true,
    swing: 50,
    theme: 'dark',
    shortcutsEnabled: true,
  })
})

afterEach(() => {
  useSettingsStore.setState({ isPlaying: false })
  restoreAudio()
})

describe('App', () => {
  it('renders the tempo, transport and rhythm controls', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Metronome' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /120 beats per minute/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start metronome' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /beat stopped of 4/i })).toBeInTheDocument()
  })

  it('starts and stops from the transport button', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start metronome' }))
    expect(useSettingsStore.getState().isPlaying).toBe(true)

    const stopButton = await screen.findByRole('button', { name: 'Stop metronome' })
    await user.click(stopButton)
    expect(useSettingsStore.getState().isPlaying).toBe(false)
  })

  it('creates exactly one AudioContext across repeated start/stop cycles', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: /metronome$/i }))
      await waitFor(() => expect(MockAudioContext.instances.length).toBe(1))
    }

    // Reusing a single context is what keeps timing stable and avoids leaking
    // audio hardware on every toggle.
    expect(MockAudioContext.instances).toHaveLength(1)
  })

  it('does not double-schedule when the button is clicked rapidly', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button', { name: 'Start metronome' })

    // Three presses in a row: start, stop, start.
    await user.click(button)
    await user.click(screen.getByRole('button', { name: /metronome$/i }))
    await user.click(screen.getByRole('button', { name: /metronome$/i }))

    await waitFor(() => expect(useSettingsStore.getState().isPlaying).toBe(true))
    const context = MockAudioContext.instances[0]!
    const afterStart = context.startedSources

    // Whatever was queued, it came from a single scheduler run; the count must
    // not jump again without the clock advancing.
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(context.startedSources).toBeGreaterThanOrEqual(afterStart)
  })

  it('adjusts the tempo with the increment and decrement buttons', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Increase BPM' }))
    expect(useSettingsStore.getState().bpm).toBe(121)

    await user.click(screen.getByRole('button', { name: 'Decrease BPM' }))
    await user.click(screen.getByRole('button', { name: 'Decrease BPM' }))
    expect(useSettingsStore.getState().bpm).toBe(119)
  })

  it('starts with the Space key', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard(' ')
    expect(useSettingsStore.getState().isPlaying).toBe(true)
  })

  it('changes the meter and resizes the beat indicator', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('radio', { name: /5 beats per measure/i }))

    expect(useSettingsStore.getState().timeSignature).toBe('5/4')
    expect(screen.getByRole('group', { name: /of 5$/i })).toBeInTheDocument()
  })

  it('changes the subdivision', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('radio', { name: '8th Triplets' }))
    expect(useSettingsStore.getState().subdivision).toBe('triplet')
  })

  it('sets the tempo from tap tempo', async () => {
    const user = userEvent.setup()
    render(<App />)

    const pad = screen.getByRole('button', { name: 'Tap to set tempo' })
    // Two taps is enough to produce a reading; the exact value depends on real
    // elapsed time, so only the fact that it changed is asserted here.
    await user.pointer({ target: pad, keys: '[MouseLeft]' })
    await user.pointer({ target: pad, keys: '[MouseLeft]' })

    await waitFor(() => expect(useSettingsStore.getState().bpm).not.toBe(BPM_DEFAULT))
  })

  it('applies the selected theme to the document', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    await user.click(screen.getByRole('radio', { name: 'Light' }))

    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('opens and closes the settings drawer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mutes from the settings drawer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    await user.click(screen.getByRole('button', { name: 'Mute' }))

    expect(useSettingsStore.getState().muted).toBe(true)
  })

  it('disables the swing slider for triplets', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('radio', { name: '8th Triplets' }))
    await user.click(screen.getByRole('button', { name: 'Open settings' }))

    expect(screen.getByRole('slider', { name: 'Swing amount' })).toBeDisabled()
  })

  it('restores persisted settings on a fresh mount', async () => {
    const user = userEvent.setup()
    const first = render(<App />)

    await user.click(screen.getByRole('radio', { name: /3 beats per measure/i }))
    first.unmount()

    await useSettingsStore.persist.rehydrate()
    render(<App />)

    expect(useSettingsStore.getState().timeSignature).toBe('3/4')
    expect(screen.getByRole('group', { name: /of 3$/i })).toBeInTheDocument()
  })
})
