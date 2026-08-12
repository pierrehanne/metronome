import { describe, expect, it } from 'vitest'
import {
  LOOKAHEAD_SECONDS,
  MetronomeScheduler,
  type SchedulerConfig,
} from './MetronomeScheduler'
import type { ScheduledClick } from '../types/metronome'

const BASE_CONFIG: SchedulerConfig = {
  bpm: 120,
  timeSignature: '4/4',
  subdivision: 'quarter',
  swing: 50,
  accentEnabled: true,
}

/**
 * Drives a scheduler with a controllable clock, exactly as the real look-ahead
 * loop does but without Web Audio or wall-clock time.
 */
function createHarness(config: Partial<SchedulerConfig> = {}) {
  let now = 0
  const clicks: ScheduledClick[] = []
  const scheduler = new MetronomeScheduler(
    () => now,
    (click) => clicks.push(click),
    { ...BASE_CONFIG, ...config },
  )

  return {
    scheduler,
    clicks,
    get now() {
      return now
    },
    /** Advance the clock in small steps, running the loop at each one. */
    advance(seconds: number, stepMs = 25) {
      const target = now + seconds
      while (now < target) {
        now = Math.min(target, now + stepMs / 1000)
        scheduler.scheduleWindow()
      }
    },
  }
}

describe('MetronomeScheduler', () => {
  it('schedules nothing until started', () => {
    const harness = createHarness()
    harness.advance(1)
    expect(harness.clicks).toHaveLength(0)
  })

  it('starts on the first beat of the measure', () => {
    const harness = createHarness()
    harness.scheduler.start()

    expect(harness.clicks[0]).toMatchObject({ beat: 0, tick: 0, level: 'accent' })
  })

  it('only schedules inside the look-ahead window', () => {
    const harness = createHarness()
    harness.scheduler.start()

    // Every scheduled click must lie within the window ahead of the clock.
    for (const click of harness.clicks) {
      expect(click.time).toBeLessThan(harness.now + LOOKAHEAD_SECONDS)
    }
    // At 120 BPM one beat is 0.5 s, well beyond a 0.12 s window, so the very
    // first pass cannot have queued the whole measure.
    expect(harness.clicks.length).toBeLessThan(4)
  })

  it('is idempotent, so repeated clicks cannot double-schedule', () => {
    const harness = createHarness()
    harness.scheduler.start()
    const afterFirstStart = harness.clicks.length

    harness.scheduler.start()
    harness.scheduler.start()

    expect(harness.clicks).toHaveLength(afterFirstStart)
    expect(harness.scheduler.isRunning).toBe(true)
  })

  it('spaces beats by exactly one beat duration', () => {
    const harness = createHarness({ bpm: 120 })
    harness.scheduler.start()
    harness.advance(2)

    for (let i = 1; i < harness.clicks.length; i++) {
      const delta = harness.clicks[i]!.time - harness.clicks[i - 1]!.time
      expect(delta).toBeCloseTo(0.5, 10)
    }
  })

  it('does not drift over a long run, even with an irregular timer', () => {
    const harness = createHarness({ bpm: 137 })
    harness.scheduler.start()

    const first = harness.clicks[0]!.time
    // Deliberately uneven wake-ups: jitter in the timer must not accumulate.
    for (const step of [7, 31, 12, 44, 25, 19, 50, 8]) {
      harness.advance(8, step)
    }

    const beatDuration = 60 / 137
    const last = harness.clicks.at(-1)!
    const expected = first + (harness.clicks.length - 1) * beatDuration

    // Exact to floating-point precision, not merely close.
    expect(last.time).toBeCloseTo(expected, 9)
  })

  it('cycles beats according to the time signature', () => {
    const harness = createHarness({ timeSignature: '3/4' })
    harness.scheduler.start()
    harness.advance(4)

    const beats = harness.clicks.map((click) => click.beat)
    expect(beats.slice(0, 7)).toEqual([0, 1, 2, 0, 1, 2, 0])
  })

  it('accents only the downbeat', () => {
    const harness = createHarness({ timeSignature: '4/4' })
    harness.scheduler.start()
    harness.advance(4)

    const accents = harness.clicks.filter((click) => click.level === 'accent')
    expect(accents.every((click) => click.beat === 0)).toBe(true)
    expect(harness.clicks.filter((click) => click.beat === 0)).toEqual(accents)
  })

  it('uses the normal voice throughout when the accent is disabled', () => {
    const harness = createHarness({ accentEnabled: false })
    harness.scheduler.start()
    harness.advance(3)

    expect(harness.clicks.some((click) => click.level === 'accent')).toBe(false)
  })

  it('divides each beat evenly for subdivisions', () => {
    const harness = createHarness({ bpm: 120, subdivision: 'sixteenth' })
    harness.scheduler.start()
    harness.advance(1)

    // 16ths at 120 BPM are 0.125 s apart.
    for (let i = 1; i < harness.clicks.length; i++) {
      const delta = harness.clicks[i]!.time - harness.clicks[i - 1]!.time
      expect(delta).toBeCloseTo(0.125, 10)
    }
    const ticks = harness.clicks.slice(0, 8).map((click) => click.tick)
    expect(ticks).toEqual([0, 1, 2, 3, 0, 1, 2, 3])
  })

  it('produces three evenly spaced clicks per beat for triplets', () => {
    const harness = createHarness({ bpm: 60, subdivision: 'triplet' })
    harness.scheduler.start()
    harness.advance(1)

    const [a, b, c] = harness.clicks
    expect(b!.time - a!.time).toBeCloseTo(1 / 3, 9)
    expect(c!.time - b!.time).toBeCloseTo(1 / 3, 9)
  })

  it('delays swung off-beats while keeping downbeats on the grid', () => {
    const harness = createHarness({ bpm: 60, subdivision: 'eighth', swing: 66 })
    harness.scheduler.start()
    harness.advance(2)

    const downbeats = harness.clicks.filter((click) => click.tick === 0)
    // Downbeats stay exactly one second apart at 60 BPM despite the swing.
    expect(downbeats[1]!.time - downbeats[0]!.time).toBeCloseTo(1, 9)

    const offBeat = harness.clicks.find((click) => click.tick === 1)!
    expect(offBeat.time - downbeats[0]!.time).toBeCloseTo(0.66, 9)
  })

  it('applies a tempo change without disturbing already-scheduled clicks', () => {
    const harness = createHarness({ bpm: 60 })
    harness.scheduler.start()
    harness.advance(1)

    const beforeChange = [...harness.clicks]
    harness.scheduler.updateConfig({ bpm: 120 })
    harness.advance(3)

    // Nothing already queued was rewritten.
    expect(harness.clicks.slice(0, beforeChange.length)).toEqual(beforeChange)

    // The beat already in flight finishes at the old tempo — that is what makes
    // a live tempo change sound smooth — and every beat after it uses the new one.
    const tail = harness.clicks.slice(-3)
    expect(tail[1]!.time - tail[0]!.time).toBeCloseTo(0.5, 9)
    expect(tail[2]!.time - tail[1]!.time).toBeCloseTo(0.5, 9)
  })

  it('keeps the beat index valid when switching to a shorter meter', () => {
    const harness = createHarness({ timeSignature: '12/8' })
    harness.scheduler.start()
    // Advance far enough to be on a beat that does not exist in 2/4.
    harness.advance(3)
    expect(harness.clicks.at(-1)!.beat).toBeGreaterThan(1)

    harness.scheduler.updateConfig({ timeSignature: '2/4' })
    harness.advance(3)

    const beats = harness.clicks.map((click) => click.beat)
    expect(Math.max(...beats.slice(-6))).toBeLessThan(2)
  })

  it('rewinds to the first beat on stop', () => {
    const harness = createHarness()
    harness.scheduler.start()
    harness.advance(1.2)
    harness.scheduler.stop()
    expect(harness.scheduler.isRunning).toBe(false)

    harness.clicks.length = 0
    harness.scheduler.start()
    expect(harness.clicks[0]).toMatchObject({ beat: 0, tick: 0 })
  })

  it('schedules nothing further once stopped', () => {
    const harness = createHarness()
    harness.scheduler.start()
    harness.scheduler.stop()
    const count = harness.clicks.length

    harness.advance(2)
    expect(harness.clicks).toHaveLength(count)
  })

  it('emits clicks in chronological order', () => {
    const harness = createHarness({ subdivision: 'sixteenth', swing: 70, bpm: 200 })
    harness.scheduler.start()
    harness.advance(5)

    for (let i = 1; i < harness.clicks.length; i++) {
      expect(harness.clicks[i]!.time).toBeGreaterThan(harness.clicks[i - 1]!.time)
    }
  })

  it('catches up rather than stalling if the timer is starved', () => {
    const harness = createHarness({ bpm: 120 })
    harness.scheduler.start()

    // A single huge jump, as when a tab is throttled and then resumes.
    harness.advance(5, 5000)

    // It kept scheduling, still without drift.
    expect(harness.clicks.length).toBeGreaterThan(8)
    const first = harness.clicks[0]!.time
    const last = harness.clicks.at(-1)!.time
    expect(last - first).toBeCloseTo((harness.clicks.length - 1) * 0.5, 9)
  })

  it('reports beat duration for the current tempo', () => {
    const harness = createHarness({ bpm: 90 })
    expect(harness.scheduler.beatDuration).toBeCloseTo(60 / 90, 10)
  })
})
