import { describe, expect, it } from 'vitest'
import {
  bpmFromTaps,
  clampBpm,
  clampBpmPrecise,
  pruneTaps,
  secondsPerBeat,
  TAP_TIMEOUT_MS,
} from './tempo'
import { BPM_MAX, BPM_MIN } from '../types/metronome'

describe('clampBpm', () => {
  it('keeps values inside the supported range', () => {
    expect(clampBpm(120)).toBe(120)
    expect(clampBpm(BPM_MIN)).toBe(BPM_MIN)
    expect(clampBpm(BPM_MAX)).toBe(BPM_MAX)
  })

  it('clamps out-of-range values to the bounds', () => {
    expect(clampBpm(5)).toBe(BPM_MIN)
    expect(clampBpm(1000)).toBe(BPM_MAX)
    expect(clampBpm(-40)).toBe(BPM_MIN)
  })

  it('rounds to whole beats and rejects non-numbers', () => {
    expect(clampBpm(120.4)).toBe(120)
    expect(clampBpm(120.6)).toBe(121)
    expect(clampBpm(Number.NaN)).toBe(BPM_MIN)
    expect(clampBpm(Number.POSITIVE_INFINITY)).toBe(BPM_MIN)
  })
})

describe('clampBpmPrecise', () => {
  it('retains one decimal place for fine adjustment', () => {
    expect(clampBpmPrecise(120.14)).toBe(120.1)
    expect(clampBpmPrecise(119.96)).toBe(120)
  })

  it('still respects the range bounds', () => {
    expect(clampBpmPrecise(19.9)).toBe(BPM_MIN)
    expect(clampBpmPrecise(300.4)).toBe(BPM_MAX)
  })
})

describe('secondsPerBeat', () => {
  it('converts tempo to beat duration', () => {
    expect(secondsPerBeat(60)).toBe(1)
    expect(secondsPerBeat(120)).toBe(0.5)
    expect(secondsPerBeat(90)).toBeCloseTo(0.6667, 4)
  })
})

describe('bpmFromTaps', () => {
  it('returns null until two taps exist', () => {
    expect(bpmFromTaps([])).toBeNull()
    expect(bpmFromTaps([1000])).toBeNull()
  })

  it('derives tempo from a single interval', () => {
    // 500 ms between taps is 120 BPM.
    expect(bpmFromTaps([0, 500])).toBe(120)
    expect(bpmFromTaps([0, 1000])).toBe(60)
  })

  it('averages several intervals', () => {
    // Intervals of 500, 500, 520, 480 average to 500 ms.
    expect(bpmFromTaps([0, 500, 1000, 1520, 2000])).toBe(120)
  })

  it('ignores taps before an unusually long pause', () => {
    const taps = [0, 5000, 5500, 6000]
    // The 5 s gap resets the phrase, leaving two 500 ms intervals.
    expect(bpmFromTaps(taps)).toBe(120)
  })

  it('treats a gap at the timeout boundary as still part of the phrase', () => {
    const taps = [0, TAP_TIMEOUT_MS]
    expect(bpmFromTaps(taps)).toBe(clampBpm(60000 / TAP_TIMEOUT_MS))
  })

  it('limits the average to the most recent taps', () => {
    // With a window of 3 only the final two intervals count, so the early slow
    // taps must not drag the result down.
    const taps = [0, 1000, 2000, 2500, 3000]
    expect(bpmFromTaps(taps, 3)).toBe(120)
  })

  it('clamps implausibly fast tapping to the maximum', () => {
    expect(bpmFromTaps([0, 10])).toBe(BPM_MAX)
  })

  it('ignores non-monotonic timestamps', () => {
    expect(bpmFromTaps([1000, 900])).toBeNull()
  })
})

describe('pruneTaps', () => {
  it('bounds the buffer to the averaging window', () => {
    expect(pruneTaps([0, 500, 1000, 1500, 2000, 2500], 3)).toEqual([1500, 2000, 2500])
  })

  it('drops everything before a long pause', () => {
    expect(pruneTaps([0, 5000, 5500])).toEqual([5000, 5500])
  })

  it('keeps a lone tap', () => {
    expect(pruneTaps([1234])).toEqual([1234])
  })
})
