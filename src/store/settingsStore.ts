import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  BPM_DEFAULT,
  SWING_DEFAULT,
  type SoundId,
  type SubdivisionId,
  type ThemeId,
  type TimeSignatureId,
} from '../types/metronome'
import { clampBpm, clampBpmPrecise } from '../utils/tempo'
import { clampSwing, getTimeSignature } from '../utils/rhythm'

export interface MetronomeState {
  // Transport (never persisted — the app always opens stopped)
  isPlaying: boolean

  // Persisted preferences
  bpm: number
  timeSignature: TimeSignatureId
  subdivision: SubdivisionId
  volume: number
  muted: boolean
  sound: SoundId
  accentSound: SoundId
  accentEnabled: boolean
  swing: number
  theme: ThemeId
  beatAnimation: boolean
  shortcutsEnabled: boolean

  // Actions
  setBpm: (bpm: number) => void
  nudgeBpm: (delta: number) => void
  resetBpm: () => void
  setPlaying: (playing: boolean) => void
  togglePlaying: () => void
  setTimeSignature: (id: TimeSignatureId) => void
  setSubdivision: (id: SubdivisionId) => void
  setVolume: (volume: number) => void
  toggleMuted: () => void
  setSound: (sound: SoundId) => void
  setAccentSound: (sound: SoundId) => void
  setAccentEnabled: (enabled: boolean) => void
  setSwing: (swing: number) => void
  setTheme: (theme: ThemeId) => void
  setBeatAnimation: (enabled: boolean) => void
  setShortcutsEnabled: (enabled: boolean) => void
}

export const STORAGE_KEY = 'metronome:settings:v1'

/**
 * A store that has already reported its beats-per-measure, so the UI can size
 * the beat indicator without recomputing the signature.
 */
export function beatsPerMeasure(state: Pick<MetronomeState, 'timeSignature'>): number {
  return getTimeSignature(state.timeSignature).beats
}

export const useSettingsStore = create<MetronomeState>()(
  persist(
    (set, get) => ({
      isPlaying: false,

      bpm: BPM_DEFAULT,
      timeSignature: '4/4',
      subdivision: 'quarter',
      volume: 0.8,
      muted: false,
      sound: 'classic',
      accentSound: 'classic',
      accentEnabled: true,
      swing: SWING_DEFAULT,
      theme: 'dark',
      beatAnimation: true,
      shortcutsEnabled: true,

      setBpm: (bpm) => set({ bpm: clampBpm(bpm) }),
      // Fractional deltas support fine adjustment without losing precision.
      nudgeBpm: (delta) => set({ bpm: clampBpmPrecise(get().bpm + delta) }),
      resetBpm: () => set({ bpm: BPM_DEFAULT }),

      setPlaying: (isPlaying) => set({ isPlaying }),
      togglePlaying: () => set({ isPlaying: !get().isPlaying }),

      setTimeSignature: (timeSignature) => set({ timeSignature }),
      setSubdivision: (subdivision) => set({ subdivision }),

      setVolume: (volume) =>
        set({ volume: Math.min(1, Math.max(0, volume)), muted: false }),
      toggleMuted: () => set({ muted: !get().muted }),

      setSound: (sound) => set({ sound }),
      setAccentSound: (accentSound) => set({ accentSound }),
      setAccentEnabled: (accentEnabled) => set({ accentEnabled }),
      setSwing: (swing) => set({ swing: clampSwing(swing) }),

      setTheme: (theme) => set({ theme }),
      setBeatAnimation: (beatAnimation) => set({ beatAnimation }),
      setShortcutsEnabled: (shortcutsEnabled) => set({ shortcutsEnabled }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // isPlaying is intentionally absent: restoring a running metronome would
      // fail anyway, since audio cannot start without a user gesture.
      partialize: (state) => ({
        bpm: state.bpm,
        timeSignature: state.timeSignature,
        subdivision: state.subdivision,
        volume: state.volume,
        muted: state.muted,
        sound: state.sound,
        accentSound: state.accentSound,
        accentEnabled: state.accentEnabled,
        swing: state.swing,
        theme: state.theme,
        beatAnimation: state.beatAnimation,
        shortcutsEnabled: state.shortcutsEnabled,
      }),
      // Values from storage are untrusted: a hand-edited or stale entry must not
      // be able to put the engine into an impossible state.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<MetronomeState>
        return {
          ...current,
          ...saved,
          bpm: clampBpm(saved.bpm ?? current.bpm),
          swing: clampSwing(saved.swing ?? current.swing),
          volume: Math.min(1, Math.max(0, saved.volume ?? current.volume)),
          timeSignature: getTimeSignature(saved.timeSignature ?? current.timeSignature).id,
          isPlaying: false,
        }
      },
    },
  ),
)
