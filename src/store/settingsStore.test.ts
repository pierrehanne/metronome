import { beforeEach, describe, expect, it } from 'vitest'
import { BPM_DEFAULT, BPM_MAX, BPM_MIN, SWING_MAX } from '../types/metronome'
import { STORAGE_KEY, useSettingsStore } from './settingsStore'

/** Reset to defaults between tests without recreating the store. */
function resetStore() {
  useSettingsStore.setState({
    isPlaying: false,
    bpm: BPM_DEFAULT,
    timeSignature: '4/4',
    subdivision: 'quarter',
    volume: 0.8,
    muted: false,
    sound: 'classic',
    accentSound: 'classic',
    accentEnabled: true,
    swing: 50,
    theme: 'dark',
    beatAnimation: true,
    shortcutsEnabled: true,
  })
}

beforeEach(() => {
  localStorage.clear()
  resetStore()
})

describe('tempo actions', () => {
  it('clamps a directly set tempo', () => {
    const { setBpm } = useSettingsStore.getState()
    setBpm(400)
    expect(useSettingsStore.getState().bpm).toBe(BPM_MAX)
    setBpm(1)
    expect(useSettingsStore.getState().bpm).toBe(BPM_MIN)
  })

  it('nudges by whole and fractional steps', () => {
    const { nudgeBpm } = useSettingsStore.getState()
    nudgeBpm(5)
    expect(useSettingsStore.getState().bpm).toBe(125)
    nudgeBpm(-0.5)
    expect(useSettingsStore.getState().bpm).toBe(124.5)
  })

  it('does not nudge past the bounds', () => {
    useSettingsStore.setState({ bpm: BPM_MAX })
    useSettingsStore.getState().nudgeBpm(10)
    expect(useSettingsStore.getState().bpm).toBe(BPM_MAX)
  })

  it('resets to the default tempo', () => {
    useSettingsStore.setState({ bpm: 200 })
    useSettingsStore.getState().resetBpm()
    expect(useSettingsStore.getState().bpm).toBe(BPM_DEFAULT)
  })
})

describe('transport', () => {
  it('toggles between playing and stopped', () => {
    const { togglePlaying } = useSettingsStore.getState()
    expect(useSettingsStore.getState().isPlaying).toBe(false)
    togglePlaying()
    expect(useSettingsStore.getState().isPlaying).toBe(true)
    togglePlaying()
    expect(useSettingsStore.getState().isPlaying).toBe(false)
  })

  it('sets the transport state explicitly', () => {
    useSettingsStore.getState().setPlaying(true)
    expect(useSettingsStore.getState().isPlaying).toBe(true)
  })
})

describe('audio settings', () => {
  it('bounds the volume and lifts mute when the slider moves', () => {
    const store = useSettingsStore.getState()
    store.toggleMuted()
    expect(useSettingsStore.getState().muted).toBe(true)

    store.setVolume(0.5)
    const state = useSettingsStore.getState()
    expect(state.volume).toBe(0.5)
    expect(state.muted).toBe(false)
  })

  it('clamps volume to 0 to 1', () => {
    const { setVolume } = useSettingsStore.getState()
    setVolume(2)
    expect(useSettingsStore.getState().volume).toBe(1)
    setVolume(-1)
    expect(useSettingsStore.getState().volume).toBe(0)
  })

  it('clamps swing to the supported range', () => {
    const { setSwing } = useSettingsStore.getState()
    setSwing(90)
    expect(useSettingsStore.getState().swing).toBe(SWING_MAX)
  })
})

describe('persistence', () => {
  it('writes preferences to localStorage', () => {
    useSettingsStore.getState().setBpm(144)
    useSettingsStore.getState().setTimeSignature('7/8')
    useSettingsStore.getState().setSound('wood')

    // Zustand's persist middleware writes synchronously after the update.
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()

    const saved = JSON.parse(raw!) as { state: Record<string, unknown> }
    expect(saved.state.bpm).toBe(144)
    expect(saved.state.timeSignature).toBe('7/8')
    expect(saved.state.sound).toBe('wood')
  })

  it('does not persist the transport state', () => {
    useSettingsStore.getState().setPlaying(true)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      state: Record<string, unknown>
    }
    expect(saved.state).not.toHaveProperty('isPlaying')
  })

  it('restores saved preferences on rehydration', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { bpm: 168, timeSignature: '5/4', subdivision: 'triplet', theme: 'light' },
      }),
    )

    await useSettingsStore.persist.rehydrate()

    const state = useSettingsStore.getState()
    expect(state.bpm).toBe(168)
    expect(state.timeSignature).toBe('5/4')
    expect(state.subdivision).toBe('triplet')
    expect(state.theme).toBe('light')
  })

  it('sanitizes out-of-range stored values', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { bpm: 9999, swing: 500, volume: 42, timeSignature: 'nonsense' },
      }),
    )

    await useSettingsStore.persist.rehydrate()

    const state = useSettingsStore.getState()
    expect(state.bpm).toBe(BPM_MAX)
    expect(state.swing).toBe(SWING_MAX)
    expect(state.volume).toBe(1)
    expect(state.timeSignature).toBe('4/4')
  })

  it('always rehydrates stopped', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, state: { isPlaying: true, bpm: 100 } }),
    )

    await useSettingsStore.persist.rehydrate()

    expect(useSettingsStore.getState().isPlaying).toBe(false)
  })
})
