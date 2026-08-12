import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { BPM_MAX, BPM_MIN } from '../types/metronome'

interface BPMControlsProps {
  bpm: number
  onNudge: (delta: number) => void
  onChange: (bpm: number) => void
}

/** Delay before a held button starts repeating, and the repeat period. */
const REPEAT_DELAY_MS = 400
const REPEAT_INTERVAL_MS = 70

/**
 * Increment/decrement buttons plus the tempo slider.
 *
 * Holding a button repeats, which is the difference between nudging 120 to 168
 * in one gesture and clicking forty-eight times.
 */
export function BPMControls({ bpm, onNudge, onChange }: BPMControlsProps) {
  const timersRef = useRef<{ timeout: number | null; interval: number | null }>({
    timeout: null,
    interval: null,
  })

  const stopRepeat = () => {
    const timers = timersRef.current
    if (timers.timeout !== null) clearTimeout(timers.timeout)
    if (timers.interval !== null) clearInterval(timers.interval)
    timers.timeout = null
    timers.interval = null
  }

  const startRepeat = (delta: number) => {
    onNudge(delta)
    stopRepeat()
    timersRef.current.timeout = window.setTimeout(() => {
      timersRef.current.interval = window.setInterval(
        () => onNudge(delta),
        REPEAT_INTERVAL_MS,
      )
    }, REPEAT_DELAY_MS)
  }

  useEffect(() => stopRepeat, [])

  const stepButton = (delta: number, label: string, Icon: typeof Plus) => (
    <button
      type="button"
      aria-label={label}
      // pointerDown rather than click so press-and-hold works on touch too.
      onPointerDown={(event) => {
        event.preventDefault()
        startRepeat(delta)
      }}
      onPointerUp={stopRepeat}
      onPointerLeave={stopRepeat}
      onPointerCancel={stopRepeat}
      className="bg-surface-raised border-line-strong text-ink hover:border-accent hover:text-accent active:bg-surface-sunken flex size-14 items-center justify-center rounded-full border transition-colors sm:size-16"
    >
      <Icon aria-hidden className="size-6" strokeWidth={2.5} />
    </button>
  )

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="flex items-center gap-6 sm:gap-8">
        {stepButton(-1, 'Decrease BPM', Minus)}
        {stepButton(1, 'Increase BPM', Plus)}
      </div>

      <div className="w-full">
        <input
          type="range"
          min={BPM_MIN}
          max={BPM_MAX}
          step={1}
          value={bpm}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label="Tempo"
          aria-valuetext={`${Math.round(bpm)} beats per minute`}
          className="slider"
        />
        <div className="text-ink-subtle tabular mt-1 flex justify-between text-[0.6875rem]">
          <span>{BPM_MIN}</span>
          <span>{BPM_MAX}</span>
        </div>
      </div>
    </div>
  )
}
