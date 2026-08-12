import type { ClickLevel, SoundId } from '../types/metronome'
import { ClickGenerator } from './ClickGenerator'

/**
 * Owns the AudioContext and the master gain chain.
 *
 * A single context is created lazily on the first user gesture (browsers
 * refuse to start one before that) and then reused for the lifetime of the
 * page. Playing a click allocates only a BufferSource, which the browser
 * reclaims when it ends.
 */
export class AudioEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private clicks: ClickGenerator | null = null

  private volume = 0.8
  private muted = false

  /** True once an AudioContext exists; it may still be suspended. */
  get isInitialized(): boolean {
    return this.context !== null
  }

  /**
   * Create or resume the context. Must be called from a user gesture. Returns
   * the running context, or null if the browser has no Web Audio support.
   */
  async resume(): Promise<AudioContext | null> {
    const context = this.ensureContext()
    if (!context) return null
    if (context.state === 'suspended') {
      await context.resume()
    }
    return context
  }

  /** Current AudioContext clock, in seconds. Zero before initialization. */
  get currentTime(): number {
    return this.context?.currentTime ?? 0
  }

  /**
   * Extra latency between a scheduled time and the sound reaching the speakers.
   * Used to align the visual beat with what the user actually hears.
   */
  get outputLatency(): number {
    if (!this.context) return 0
    const context = this.context as AudioContext & { outputLatency?: number }
    return context.outputLatency ?? context.baseLatency ?? 0
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume))
    this.applyGain()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyGain()
  }

  /** Render a preset's buffers ahead of time to avoid a first-click hitch. */
  prewarm(sound: SoundId): void {
    this.clicks?.prewarm(sound)
  }

  /**
   * Schedule one click at an absolute AudioContext time. Times in the past are
   * clamped to "now" rather than dropped, so a delayed scheduler tick still
   * produces sound instead of silently skipping a beat.
   */
  playClick(sound: SoundId, level: ClickLevel, time: number): void {
    const context = this.context
    const clicks = this.clicks
    const destination = this.masterGain
    if (!context || !clicks || !destination) return

    const source = context.createBufferSource()
    source.buffer = clicks.get(sound, level)
    source.connect(destination)
    source.start(Math.max(time, context.currentTime))
  }

  /** Release audio hardware. The engine can be re-initialized afterwards. */
  async close(): Promise<void> {
    const context = this.context
    this.context = null
    this.masterGain = null
    this.clicks = null
    if (context && context.state !== 'closed') {
      await context.close()
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context

    const Ctor =
      typeof window === 'undefined'
        ? undefined
        : (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)
    if (!Ctor) return null

    // "interactive" asks the browser for the smallest safe buffer, which keeps
    // the gap between scheduling and audible sound as short as possible.
    const context = new Ctor({ latencyHint: 'interactive' })
    const masterGain = context.createGain()
    masterGain.connect(context.destination)

    this.context = context
    this.masterGain = masterGain
    this.clicks = new ClickGenerator(context)
    this.applyGain()

    return context
  }

  private applyGain(): void {
    const gain = this.masterGain
    const context = this.context
    if (!gain || !context) return

    // Perceived loudness is closer to the square of the slider position, and a
    // short ramp prevents a click when the user drags the volume control.
    const target = this.muted ? 0 : this.volume ** 2
    gain.gain.cancelScheduledValues(context.currentTime)
    gain.gain.setTargetAtTime(target, context.currentTime, 0.015)
  }
}
