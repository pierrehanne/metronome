import { describe, expect, it } from 'vitest'
import {
  beatEmphasis,
  clampSwing,
  clickLevelFor,
  getSubdivision,
  getTimeSignature,
  supportsSwing,
  tickOffsetInBeat,
} from './rhythm'
import { SWING_MAX, SWING_MIN, TIME_SIGNATURES } from '../types/metronome'

describe('getTimeSignature', () => {
  it('resolves every declared signature', () => {
    for (const signature of TIME_SIGNATURES) {
      expect(getTimeSignature(signature.id).beats).toBe(signature.beats)
    }
  })

  it('reports the expected beat counts', () => {
    expect(getTimeSignature('4/4').beats).toBe(4)
    expect(getTimeSignature('7/8').beats).toBe(7)
    expect(getTimeSignature('12/8').beats).toBe(12)
  })

  it('falls back to 4/4 for an unknown id', () => {
    // Simulates a stale value read back from localStorage.
    expect(getTimeSignature('13/16' as never).id).toBe('4/4')
  })
})

describe('getSubdivision', () => {
  it('maps subdivisions to clicks per beat', () => {
    expect(getSubdivision('quarter').ticksPerBeat).toBe(1)
    expect(getSubdivision('eighth').ticksPerBeat).toBe(2)
    expect(getSubdivision('triplet').ticksPerBeat).toBe(3)
    expect(getSubdivision('sixteenth').ticksPerBeat).toBe(4)
  })

  it('falls back to quarter notes for an unknown id', () => {
    expect(getSubdivision('quintuplet' as never).id).toBe('quarter')
  })
})

describe('clampSwing', () => {
  it('bounds swing to the supported range', () => {
    expect(clampSwing(50)).toBe(SWING_MIN)
    expect(clampSwing(10)).toBe(SWING_MIN)
    expect(clampSwing(99)).toBe(SWING_MAX)
    expect(clampSwing(Number.NaN)).toBe(SWING_MIN)
  })
})

describe('supportsSwing', () => {
  it('applies to even subdivisions only', () => {
    expect(supportsSwing(2)).toBe(true)
    expect(supportsSwing(4)).toBe(true)
    expect(supportsSwing(3)).toBe(false)
    expect(supportsSwing(1)).toBe(false)
  })
})

describe('tickOffsetInBeat', () => {
  it('spaces ticks evenly when swing is off', () => {
    expect(tickOffsetInBeat(0, 4, SWING_MIN)).toBe(0)
    expect(tickOffsetInBeat(1, 4, SWING_MIN)).toBe(0.25)
    expect(tickOffsetInBeat(2, 4, SWING_MIN)).toBe(0.5)
    expect(tickOffsetInBeat(3, 4, SWING_MIN)).toBe(0.75)
  })

  it('leaves the beat itself untouched at any swing setting', () => {
    expect(tickOffsetInBeat(0, 2, 66)).toBe(0)
    expect(tickOffsetInBeat(0, 4, SWING_MAX)).toBe(0)
  })

  it('delays the off-beat of eighth notes', () => {
    // At 66% the second eighth lands two-thirds into the beat: a triplet feel.
    expect(tickOffsetInBeat(1, 2, 66)).toBeCloseTo(0.66, 5)
    // At 75% it lands three-quarters in: a dotted-eighth/sixteenth feel.
    expect(tickOffsetInBeat(1, 2, 75)).toBeCloseTo(0.75, 5)
  })

  it('swings sixteenths pairwise within each eighth', () => {
    // Each pair spans half a beat, so the second pair still starts at 0.5.
    expect(tickOffsetInBeat(0, 4, 66)).toBeCloseTo(0, 5)
    expect(tickOffsetInBeat(1, 4, 66)).toBeCloseTo(0.33, 5)
    expect(tickOffsetInBeat(2, 4, 66)).toBeCloseTo(0.5, 5)
    expect(tickOffsetInBeat(3, 4, 66)).toBeCloseTo(0.83, 5)
  })

  it('never swings triplets, whatever the setting', () => {
    expect(tickOffsetInBeat(1, 3, SWING_MAX)).toBeCloseTo(1 / 3, 5)
    expect(tickOffsetInBeat(2, 3, SWING_MAX)).toBeCloseTo(2 / 3, 5)
  })

  it('keeps ticks in ascending order when swung', () => {
    const offsets = [0, 1, 2, 3].map((tick) => tickOffsetInBeat(tick, 4, 70))
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]!).toBeGreaterThan(offsets[i - 1]!)
    }
    // And all still inside the beat.
    expect(offsets.at(-1)!).toBeLessThan(1)
  })
})

describe('clickLevelFor', () => {
  it('accents beat 1 when enabled', () => {
    expect(clickLevelFor(0, 0, true)).toBe('accent')
  })

  it('uses the normal voice for beat 1 when the accent is off', () => {
    expect(clickLevelFor(0, 0, false)).toBe('beat')
  })

  it('uses the normal voice for other beats', () => {
    expect(clickLevelFor(1, 0, true)).toBe('beat')
    expect(clickLevelFor(3, 0, true)).toBe('beat')
  })

  it('uses the quiet voice for every off-beat tick', () => {
    expect(clickLevelFor(0, 1, true)).toBe('subdivision')
    expect(clickLevelFor(2, 3, false)).toBe('subdivision')
  })
})

describe('beatEmphasis', () => {
  it('marks the downbeat as the accent', () => {
    expect(beatEmphasis(0, getTimeSignature('4/4'), true)).toBe('accent')
    expect(beatEmphasis(0, getTimeSignature('4/4'), false)).toBe('normal')
  })

  it('marks grouping beats in compound and odd meters', () => {
    expect(beatEmphasis(2, getTimeSignature('7/8'), true)).toBe('group')
    expect(beatEmphasis(4, getTimeSignature('7/8'), true)).toBe('group')
    expect(beatEmphasis(1, getTimeSignature('7/8'), true)).toBe('normal')
    expect(beatEmphasis(3, getTimeSignature('6/8'), true)).toBe('group')
  })
})
