import type { TimeSignature } from '../types/metronome'
import { beatEmphasis } from '../utils/rhythm'

interface BeatIndicatorProps {
  signature: TimeSignature
  /** Beat currently sounding, or null while stopped. */
  currentBeat: number | null
  accentEnabled: boolean
  animate: boolean
}

/**
 * Row of dots showing the position in the measure.
 *
 * The active beat is marked by size, fill and a ring — never by colour alone —
 * and the whole row is a single live region so a screen reader announces the
 * count without the user having to look.
 */
export function BeatIndicator({
  signature,
  currentBeat,
  accentEnabled,
  animate,
}: BeatIndicatorProps) {
  const beats = Array.from({ length: signature.beats }, (_, index) => index)

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
      role="group"
      aria-label={`Beat ${currentBeat === null ? 'stopped' : currentBeat + 1} of ${signature.beats}`}
    >
      {beats.map((beat) => {
        const emphasis = beatEmphasis(beat, signature, accentEnabled)
        const isActive = currentBeat === beat
        const isAccent = emphasis === 'accent'

        // Downbeats read larger than the rest so the measure has a visible shape
        // even when the metronome is stopped.
        const size = isAccent ? 'size-4 sm:size-5' : 'size-3 sm:size-3.5'

        return (
          <span
            key={beat}
            aria-hidden
            className={[
              'rounded-full border-2',
              size,
              animate ? 'transition-all duration-75' : '',
              isActive
                ? isAccent
                  ? 'border-accent bg-accent scale-125 shadow-[0_0_14px_var(--accent)]'
                  : 'border-beat bg-beat scale-125 shadow-[0_0_10px_var(--beat)]'
                : emphasis === 'normal'
                  ? 'border-line-strong bg-transparent'
                  : 'border-line-strong bg-line-strong',
            ].join(' ')}
          />
        )
      })}

      {/* Screen-reader-only running count; polite so it never interrupts. */}
      <span className="sr-only" aria-live="polite">
        {currentBeat === null ? '' : `Beat ${currentBeat + 1}`}
      </span>
    </div>
  )
}
