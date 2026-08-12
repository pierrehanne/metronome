import type { ClickLevel, SoundId } from '../types/metronome'

export interface SoundPreset {
  id: SoundId
  label: string
  description: string
}

export const SOUND_PRESETS: readonly SoundPreset[] = [
  { id: 'classic', label: 'Classic', description: 'Warm mechanical tick' },
  { id: 'digital', label: 'Digital', description: 'Sharp studio beep' },
  { id: 'wood', label: 'Wood', description: 'Woodblock / clave' },
  { id: 'electronic', label: 'Electronic', description: 'Synthetic blip' },
  { id: 'soft', label: 'Soft', description: 'Rounded, low fatigue' },
  { id: 'cowbell', label: 'Cowbell', description: 'Metallic, cuts through' },
] as const

/** Base pitch per voice, in Hz. Presets scale these. */
const LEVEL_PITCH: Record<ClickLevel, number> = {
  accent: 1600,
  beat: 1000,
  subdivision: 800,
}

/** Relative loudness per voice, so subdivisions sit under the main pulse. */
const LEVEL_GAIN: Record<ClickLevel, number> = {
  accent: 1,
  beat: 0.72,
  subdivision: 0.4,
}

interface Recipe {
  /** Total length of the rendered click, in seconds. */
  duration: number
  /** Exponential amplitude decay constant; higher decays faster. */
  decay: number
  /** Pitch multiplier applied to the voice's base frequency. */
  pitchScale: number
  /** 0 = pure tone, 1 = pure noise. */
  noise: number
  /**
   * Waveshaping amount. 0 leaves a sine; higher values fold the waveform,
   * adding odd harmonics for a brighter, harder click.
   */
  drive: number
  /** Optional inharmonic partial, as a ratio of the fundamental. */
  partial?: number
  /** Downward pitch sweep over the click, as a fraction of the fundamental. */
  sweep?: number
  /** Attack time in seconds; a short ramp removes the initial transient. */
  attack?: number
}

const RECIPES: Record<SoundId, Recipe> = {
  classic: { duration: 0.055, decay: 120, pitchScale: 1, noise: 0.28, drive: 1.6 },
  digital: { duration: 0.045, decay: 90, pitchScale: 1.25, noise: 0, drive: 3.5 },
  wood: {
    duration: 0.05,
    decay: 150,
    pitchScale: 0.85,
    noise: 0.45,
    drive: 2.2,
    partial: 2.7,
    sweep: 0.25,
  },
  electronic: {
    duration: 0.06,
    decay: 70,
    pitchScale: 1.1,
    noise: 0,
    drive: 1,
    sweep: 0.4,
  },
  soft: {
    duration: 0.09,
    decay: 45,
    pitchScale: 0.62,
    noise: 0,
    drive: 0,
    attack: 0.004,
  },
  cowbell: {
    duration: 0.16,
    decay: 26,
    pitchScale: 0.55,
    noise: 0,
    drive: 2.8,
    partial: 1.48,
  },
}

/**
 * Deterministic pseudo-random source. Using a seeded generator instead of
 * Math.random keeps every rendering of a preset identical, which matters
 * because buffers are cached and reused for the lifetime of the page.
 */
function createNoise(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    // xorshift32
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return (state / 0xffffffff) * 2 - 1
  }
}

function shape(sample: number, drive: number): number {
  if (drive <= 0) return sample
  return Math.tanh(sample * (1 + drive)) / Math.tanh(1 + drive)
}

/**
 * Renders and caches one short AudioBuffer per (sound, voice) pair.
 *
 * Synthesising the clicks avoids shipping audio assets entirely, and because
 * each buffer is rendered once and replayed through a cheap BufferSource, an
 * individual click costs almost nothing at schedule time.
 */
export class ClickGenerator {
  private readonly cache = new Map<string, AudioBuffer>()
  private readonly context: BaseAudioContext

  constructor(context: BaseAudioContext) {
    this.context = context
  }

  get(sound: SoundId, level: ClickLevel): AudioBuffer {
    const key = `${sound}:${level}`
    const cached = this.cache.get(key)
    if (cached) return cached

    const buffer = this.render(sound, level)
    this.cache.set(key, buffer)
    return buffer
  }

  /** Pre-render every voice of a preset, so the first click is never late. */
  prewarm(sound: SoundId): void {
    this.get(sound, 'accent')
    this.get(sound, 'beat')
    this.get(sound, 'subdivision')
  }

  private render(sound: SoundId, level: ClickLevel): AudioBuffer {
    const recipe = RECIPES[sound]
    const { sampleRate } = this.context
    const length = Math.max(1, Math.ceil(recipe.duration * sampleRate))
    const buffer = this.context.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    const frequency = LEVEL_PITCH[level] * recipe.pitchScale
    const peak = LEVEL_GAIN[level]
    const noise = createNoise(0x9e3779b9 ^ (frequency * 1000))
    const attack = recipe.attack ?? 0.0005
    const sweep = recipe.sweep ?? 0

    // Integrate phase explicitly so the pitch sweep stays continuous.
    let phase = 0
    let partialPhase = 0

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const progress = t / recipe.duration

      const currentFrequency = frequency * (1 - sweep * progress)
      phase += (2 * Math.PI * currentFrequency) / sampleRate
      partialPhase += (2 * Math.PI * currentFrequency * (recipe.partial ?? 0)) / sampleRate

      let sample = Math.sin(phase)
      if (recipe.partial) sample = sample * 0.7 + Math.sin(partialPhase) * 0.5
      sample = shape(sample, recipe.drive)
      if (recipe.noise > 0) {
        sample = sample * (1 - recipe.noise) + noise() * recipe.noise
      }

      // Exponential decay with a short attack ramp, then a fade to zero over
      // the final samples so the buffer never ends on a discontinuity.
      const envelope =
        Math.min(1, t / attack) *
        Math.exp(-recipe.decay * t) *
        Math.min(1, (1 - progress) * 12)

      data[i] = sample * envelope * peak
    }

    return buffer
  }
}
