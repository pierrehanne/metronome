import { useCallback, useEffect, useRef, useState } from 'react'
import { bpmFromTaps, pruneTaps, TAP_TIMEOUT_MS } from '../utils/tempo'
import { useSettingsStore } from '../store/settingsStore'

export interface UseTapTempoResult {
  /** BPM derived from the current run of taps, or null before two taps. */
  tappedBpm: number | null
  /** Number of taps in the current run. */
  tapCount: number
  tap: () => void
  reset: () => void
}

/**
 * Tap tempo: averages the intervals between taps and applies the result.
 *
 * Timestamps come from performance.now() rather than Date.now() so the reading
 * is unaffected by wall-clock adjustments.
 */
export function useTapTempo(): UseTapTempoResult {
  const setBpm = useSettingsStore((state) => state.setBpm)
  const [tappedBpm, setTappedBpm] = useState<number | null>(null)
  const [tapCount, setTapCount] = useState(0)
  const tapsRef = useRef<number[]>([])
  const idleTimerRef = useRef<number | null>(null)

  const reset = useCallback(() => {
    tapsRef.current = []
    setTapCount(0)
    setTappedBpm(null)
  }, [])

  const tap = useCallback(() => {
    const now = performance.now()
    const taps = pruneTaps([...tapsRef.current, now])
    tapsRef.current = taps
    setTapCount(taps.length)

    const bpm = bpmFromTaps(taps)
    if (bpm !== null) {
      setTappedBpm(bpm)
      setBpm(bpm)
    } else {
      setTappedBpm(null)
    }

    // Clear the run once the user stops tapping, so the next tap starts fresh.
    if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => {
      tapsRef.current = []
      setTapCount(0)
    }, TAP_TIMEOUT_MS)
  }, [setBpm])

  useEffect(
    () => () => {
      if (idleTimerRef.current !== null) clearTimeout(idleTimerRef.current)
    },
    [],
  )

  return { tappedBpm, tapCount, tap, reset }
}
