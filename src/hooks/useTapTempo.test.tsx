import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { useTapTempo } from './useTapTempo'
import { useSettingsStore } from '../store/settingsStore'
import { BPM_DEFAULT } from '../types/metronome'
import { TAP_TIMEOUT_MS } from '../utils/tempo'

function Harness() {
  const { tap, tappedBpm, tapCount } = useTapTempo()
  return (
    <div>
      <button type="button" onClick={tap}>
        tap
      </button>
      <output data-testid="bpm">{tappedBpm ?? 'none'}</output>
      <output data-testid="count">{tapCount}</output>
    </div>
  )
}

let now = 0

beforeEach(() => {
  vi.useFakeTimers()
  now = 1000
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  localStorage.clear()
  useSettingsStore.setState({ bpm: BPM_DEFAULT })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Tap after advancing the mocked clock by the given interval. */
function tapAfter(ms: number) {
  now += ms
  act(() => {
    screen.getByRole('button', { name: 'tap' }).click()
  })
}

describe('useTapTempo', () => {
  it('reports nothing after a single tap', () => {
    render(<Harness />)
    tapAfter(0)

    expect(screen.getByTestId('bpm')).toHaveTextContent('none')
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })

  it('derives and applies a tempo from steady tapping', () => {
    render(<Harness />)
    tapAfter(0)
    tapAfter(500)
    tapAfter(500)
    tapAfter(500)

    expect(screen.getByTestId('bpm')).toHaveTextContent('120')
    expect(useSettingsStore.getState().bpm).toBe(120)
  })

  it('averages uneven taps', () => {
    render(<Harness />)
    tapAfter(0)
    tapAfter(480)
    tapAfter(520)

    expect(useSettingsStore.getState().bpm).toBe(120)
  })

  it('starts a new phrase after a long pause', () => {
    render(<Harness />)
    tapAfter(0)
    tapAfter(1000) // 60 BPM
    expect(useSettingsStore.getState().bpm).toBe(60)

    // A long pause, then a faster phrase.
    tapAfter(TAP_TIMEOUT_MS + 500)
    tapAfter(400)
    tapAfter(400)

    expect(useSettingsStore.getState().bpm).toBe(150)
  })

  it('clears the run once tapping stops', () => {
    render(<Harness />)
    tapAfter(0)
    tapAfter(500)
    expect(screen.getByTestId('count')).toHaveTextContent('2')

    act(() => {
      vi.advanceTimersByTime(TAP_TIMEOUT_MS + 100)
    })

    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })
})
