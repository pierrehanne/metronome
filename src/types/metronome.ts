/** Domain types shared by the audio engine, the store and the UI. */

export const BPM_MIN = 20
export const BPM_MAX = 300
export const BPM_DEFAULT = 120

export const SWING_MIN = 50
export const SWING_MAX = 75
export const SWING_DEFAULT = 50

export type TimeSignatureId = '2/4' | '3/4' | '4/4' | '5/4' | '6/8' | '7/8' | '9/8' | '12/8'

export interface TimeSignature {
  id: TimeSignatureId
  beats: number
  /** Note value that gets one beat: 4 = quarter, 8 = eighth. */
  noteValue: 4 | 8
  label: string
  /**
   * Beats that carry a secondary (medium) accent, 0-indexed. Compound and
   * odd meters group their pulses, e.g. 7/8 is felt as 2+2+3.
   */
  groupAccents: readonly number[]
}

/**
 * Adding a signature here is all that is required to expose it in the UI.
 * Beat 0 is always the primary accent, so it never appears in groupAccents.
 */
export const TIME_SIGNATURES: readonly TimeSignature[] = [
  { id: '2/4', beats: 2, noteValue: 4, label: '2/4', groupAccents: [] },
  { id: '3/4', beats: 3, noteValue: 4, label: '3/4', groupAccents: [] },
  { id: '4/4', beats: 4, noteValue: 4, label: '4/4', groupAccents: [2] },
  { id: '5/4', beats: 5, noteValue: 4, label: '5/4', groupAccents: [3] },
  { id: '6/8', beats: 6, noteValue: 8, label: '6/8', groupAccents: [3] },
  { id: '7/8', beats: 7, noteValue: 8, label: '7/8', groupAccents: [2, 4] },
  { id: '9/8', beats: 9, noteValue: 8, label: '9/8', groupAccents: [3, 6] },
  { id: '12/8', beats: 12, noteValue: 8, label: '12/8', groupAccents: [3, 6, 9] },
] as const

export type SubdivisionId = 'quarter' | 'eighth' | 'triplet' | 'sixteenth'

export interface Subdivision {
  id: SubdivisionId
  /** Clicks per beat. */
  ticksPerBeat: number
  label: string
  shortLabel: string
}

export const SUBDIVISIONS: readonly Subdivision[] = [
  { id: 'quarter', ticksPerBeat: 1, label: 'Quarter Notes', shortLabel: '1' },
  { id: 'eighth', ticksPerBeat: 2, label: '8th Notes', shortLabel: '2' },
  { id: 'triplet', ticksPerBeat: 3, label: '8th Triplets', shortLabel: '3' },
  { id: 'sixteenth', ticksPerBeat: 4, label: '16th Notes', shortLabel: '4' },
] as const

export type SoundId = 'classic' | 'digital' | 'wood' | 'electronic' | 'soft' | 'cowbell'

export type ThemeId = 'dark' | 'oled' | 'light'

/** Which of the three voices a scheduled click should use. */
export type ClickLevel = 'accent' | 'beat' | 'subdivision'

export interface ScheduledClick {
  /** AudioContext time, in seconds, at which the click fires. */
  time: number
  /** 0-indexed beat within the measure. */
  beat: number
  /** 0-indexed tick within the beat (0 is the beat itself). */
  tick: number
  level: ClickLevel
}

export type TransportState = 'stopped' | 'playing' | 'paused'
