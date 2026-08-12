import {
  type ScheduledClick,
  type SubdivisionId,
  type TimeSignatureId,
} from '../types/metronome'
import {
  clickLevelFor,
  getSubdivision,
  getTimeSignature,
  tickOffsetInBeat,
} from '../utils/rhythm'
import { secondsPerBeat } from '../utils/tempo'

export interface SchedulerConfig {
  bpm: number
  timeSignature: TimeSignatureId
  subdivision: SubdivisionId
  swing: number
  accentEnabled: boolean
}

/** How far ahead of the audio clock clicks are scheduled, in seconds. */
export const LOOKAHEAD_SECONDS = 0.12

/** How often the scheduling loop runs, in milliseconds. */
export const SCHEDULER_INTERVAL_MS = 25

/** Delay before the very first click, giving the graph time to settle. */
const START_OFFSET_SECONDS = 0.06

/**
 * Look-ahead scheduler for the metronome.
 *
 * Timing comes entirely from the AudioContext clock: a coarse timer wakes the
 * scheduler roughly every 25 ms and it queues every click that falls inside the
 * next look-ahead window. Because each click's time is computed from the
 * measure's start rather than from the previous click, jitter in the timer
 * cannot accumulate into drift — the timer only decides *when we look*, never
 * *when a click sounds*.
 *
 * The scheduler is deliberately free of React and of the Web Audio API: it
 * receives a clock and emits ScheduledClick values, which makes its timing
 * directly testable.
 */
export class MetronomeScheduler {
  private config: SchedulerConfig
  private running = false

  /** Beat index within the measure of the next click to be scheduled. */
  private beat = 0
  /** Tick index within the beat of the next click to be scheduled. */
  private tick = 0
  /** AudioContext time at which the current beat began. */
  private beatStartTime = 0

  /** Returns the current audio clock time, in seconds. */
  private readonly now: () => number
  /** Receives every scheduled click, in chronological order. */
  private readonly emit: (click: ScheduledClick) => void

  constructor(
    now: () => number,
    emit: (click: ScheduledClick) => void,
    config: SchedulerConfig,
  ) {
    this.now = now
    this.emit = emit
    this.config = { ...config }
  }

  get isRunning(): boolean {
    return this.running
  }

  /** Duration of one beat at the current tempo, in seconds. */
  get beatDuration(): number {
    return secondsPerBeat(this.config.bpm)
  }

  /**
   * Begin from the top of a measure. Calling start() while already running is a
   * no-op, so repeated clicks on the play button cannot double-schedule.
   */
  start(): void {
    if (this.running) return
    this.running = true
    this.beat = 0
    this.tick = 0
    this.beatStartTime = this.now() + START_OFFSET_SECONDS
    this.scheduleWindow()
  }

  /** Stop and rewind to the first beat. */
  stop(): void {
    this.running = false
    this.beat = 0
    this.tick = 0
  }

  /**
   * Update settings while running. Tempo and rhythm changes take effect from
   * the current beat onward: already-scheduled clicks keep their times, which
   * is what makes a live tempo change sound smooth rather than stuttering.
   */
  updateConfig(partial: Partial<SchedulerConfig>): void {
    const previous = this.config
    this.config = { ...previous, ...partial }

    if (!this.running) return

    // Changing the meter or subdivision mid-measure would leave the indices
    // pointing at beats that no longer exist, so restart the measure cleanly
    // from the next beat boundary.
    const meterChanged =
      partial.timeSignature !== undefined &&
      partial.timeSignature !== previous.timeSignature
    const subdivisionChanged =
      partial.subdivision !== undefined && partial.subdivision !== previous.subdivision

    if (meterChanged || subdivisionChanged) {
      const beats = getTimeSignature(this.config.timeSignature).beats
      if (this.beat >= beats) this.beat = 0
      this.tick = 0
      this.beatStartTime = Math.max(this.beatStartTime, this.now())
    }
  }

  /** Run one pass of the scheduling loop. */
  scheduleWindow(): void {
    if (!this.running) return

    const horizon = this.now() + LOOKAHEAD_SECONDS
    // Bounded to stay safe if the clock ever jumps forward sharply.
    let guard = 512

    while (guard-- > 0) {
      const time = this.nextClickTime()
      if (time >= horizon) break

      this.emit({
        time,
        beat: this.beat,
        tick: this.tick,
        level: clickLevelFor(this.beat, this.tick, this.config.accentEnabled),
      })
      this.advance()
    }
  }

  /** Absolute time of the next click to be scheduled. */
  private nextClickTime(): number {
    const { ticksPerBeat } = getSubdivision(this.config.subdivision)
    const offset = tickOffsetInBeat(this.tick, ticksPerBeat, this.config.swing)
    return this.beatStartTime + offset * this.beatDuration
  }

  private advance(): void {
    const { ticksPerBeat } = getSubdivision(this.config.subdivision)
    const { beats } = getTimeSignature(this.config.timeSignature)

    this.tick += 1
    if (this.tick < ticksPerBeat) return

    this.tick = 0
    this.beat = (this.beat + 1) % beats
    // Advancing the anchor by exactly one beat keeps long-run timing exact.
    this.beatStartTime += this.beatDuration
  }
}
