import { vi } from 'vitest'

/**
 * Minimal Web Audio stand-in for jsdom, which implements none of it.
 *
 * The clock advances only when the test asks it to, so component tests stay
 * deterministic; the scheduler's own timing is covered separately against a
 * controllable clock.
 */
export class MockAudioContext {
  static instances: MockAudioContext[] = []

  state: AudioContextState = 'running'
  sampleRate = 48000
  currentTime = 0
  baseLatency = 0
  destination = {} as AudioDestinationNode
  startedSources = 0

  constructor() {
    MockAudioContext.instances.push(this)
  }

  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        value: 1,
        cancelScheduledValues: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
    } as unknown as GainNode
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = new Float32Array(length)
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: () => data,
    } as unknown as AudioBuffer
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(() => {
        this.startedSources += 1
      }),
      stop: vi.fn(),
    } as unknown as AudioBufferSourceNode
  }

  // Return resolved promises rather than being `async`, matching the real API's
  // signature without an unnecessary microtask.
  resume = vi.fn(() => {
    this.state = 'running'
    return Promise.resolve()
  })

  close = vi.fn(() => {
    this.state = 'closed'
    return Promise.resolve()
  })
}

/** Install the mock and return a cleanup function. */
export function installMockAudioContext(): () => void {
  const original = window.AudioContext
  MockAudioContext.instances = []
  window.AudioContext = MockAudioContext as unknown as typeof AudioContext

  return () => {
    window.AudioContext = original
    MockAudioContext.instances = []
  }
}
