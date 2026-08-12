import {
  SUBDIVISIONS,
  SWING_MAX,
  SWING_MIN,
  TIME_SIGNATURES,
  type ClickLevel,
  type Subdivision,
  type SubdivisionId,
  type TimeSignature,
  type TimeSignatureId,
} from '../types/metronome'

export function getTimeSignature(id: TimeSignatureId): TimeSignature {
  const found = TIME_SIGNATURES.find((signature) => signature.id === id)
  return found ?? TIME_SIGNATURES[2]! // 4/4
}

export function getSubdivision(id: SubdivisionId): Subdivision {
  const found = SUBDIVISIONS.find((subdivision) => subdivision.id === id)
  return found ?? SUBDIVISIONS[0]! // quarter
}

export function clampSwing(percent: number): number {
  if (!Number.isFinite(percent)) return SWING_MIN
  return Math.min(SWING_MAX, Math.max(SWING_MIN, Math.round(percent)))
}

/**
 * Swing only makes musical sense for even subdivisions, where it delays the
 * off-beat of each pair. Triplets are always played straight.
 */
export function supportsSwing(ticksPerBeat: number): boolean {
  return ticksPerBeat % 2 === 0
}

/**
 * Position of a tick within its beat, as a fraction of the beat (0 <= x < 1).
 *
 * With swing at 50% ticks are evenly spaced. Above that, each pair of ticks is
 * skewed so the first one lasts `swing`% of the pair: 66% approximates a
 * triplet feel and 75% a dotted-eighth/sixteenth feel. 16th notes are swung
 * pairwise inside each eighth, which is how 16th swing is normally notated.
 */
export function tickOffsetInBeat(
  tick: number,
  ticksPerBeat: number,
  swingPercent: number,
): number {
  const straight = tick / ticksPerBeat
  if (!supportsSwing(ticksPerBeat) || swingPercent <= SWING_MIN) return straight

  const ratio = swingPercent / 100
  const pairDuration = 2 / ticksPerBeat // fraction of a beat covered by one pair
  const pairIndex = Math.floor(tick / 2)
  const isOffBeat = tick % 2 === 1

  return pairIndex * pairDuration + (isOffBeat ? ratio * pairDuration : 0)
}

/** Which voice a given tick should use. */
export function clickLevelFor(
  beat: number,
  tick: number,
  accentEnabled: boolean,
): ClickLevel {
  if (tick !== 0) return 'subdivision'
  if (beat === 0 && accentEnabled) return 'accent'
  return 'beat'
}

/** Visual emphasis for the beat dots; independent from the audio voices. */
export type BeatEmphasis = 'accent' | 'group' | 'normal'

export function beatEmphasis(
  beat: number,
  signature: TimeSignature,
  accentEnabled: boolean,
): BeatEmphasis {
  if (beat === 0) return accentEnabled ? 'accent' : 'normal'
  return signature.groupAccents.includes(beat) ? 'group' : 'normal'
}
