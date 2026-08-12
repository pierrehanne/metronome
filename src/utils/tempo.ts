import { BPM_MAX, BPM_MIN } from '../types/metronome'

/** Clamp an arbitrary number into the supported BPM range, rounded to 1 BPM. */
export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return BPM_MIN
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)))
}

/** Clamp allowing fractional BPM, for fine adjustment. */
export function clampBpmPrecise(bpm: number, decimals = 1): number {
  if (!Number.isFinite(bpm)) return BPM_MIN
  const factor = 10 ** decimals
  const rounded = Math.round(bpm * factor) / factor
  return Math.min(BPM_MAX, Math.max(BPM_MIN, rounded))
}

/** Seconds per beat for a given tempo. */
export function secondsPerBeat(bpm: number): number {
  return 60 / bpm
}

/** Longest gap between two taps that still counts as the same tempo, in ms. */
export const TAP_TIMEOUT_MS = 2000

/** Taps kept in the rolling average. */
export const TAP_WINDOW = 5

/**
 * Derive a BPM from a series of tap timestamps (ms, ascending).
 *
 * Intervals longer than TAP_TIMEOUT_MS end the phrase: only the taps after the
 * last such pause are used, so a musician can pause and re-tap without having
 * to reset. Returns null until at least two usable taps exist.
 */
export function bpmFromTaps(
  timestamps: readonly number[],
  window = TAP_WINDOW,
): number | null {
  if (timestamps.length < 2) return null

  const intervals: number[] = []
  for (let i = timestamps.length - 1; i > 0; i--) {
    const interval = timestamps[i]! - timestamps[i - 1]!
    // A long pause (or a non-monotonic timestamp) ends the usable run.
    if (interval > TAP_TIMEOUT_MS || interval <= 0) break
    intervals.unshift(interval)
    if (intervals.length >= window - 1) break
  }

  if (intervals.length === 0) return null

  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length
  return clampBpm(60000 / mean)
}

/**
 * Drop taps that precede the most recent pause, keeping the buffer bounded.
 * Used to avoid growing an unbounded array of timestamps.
 */
export function pruneTaps(timestamps: readonly number[], window = TAP_WINDOW): number[] {
  const kept: number[] = []
  for (let i = timestamps.length - 1; i >= 0; i--) {
    const current = timestamps[i]!
    const previous = timestamps[i - 1]
    kept.unshift(current)
    if (kept.length >= window) break
    if (previous === undefined || current - previous > TAP_TIMEOUT_MS) break
  }
  return kept
}
