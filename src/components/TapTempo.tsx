import { Hand } from 'lucide-react'

interface TapTempoProps {
  onTap: () => void
  tappedBpm: number | null
  tapCount: number
}

/**
 * Tap tempo pad.
 *
 * Fires on pointerdown rather than click: the delay between press and release
 * would otherwise be folded into the measured interval.
 */
export function TapTempo({ onTap, tappedBpm, tapCount }: TapTempoProps) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label-eyebrow">Tap Tempo</span>
        <span className="text-ink-muted tabular text-xs">
          {tappedBpm !== null ? `${tappedBpm} BPM` : tapCount === 1 ? 'Keep tapping…' : 'T'}
        </span>
      </div>

      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault()
          onTap()
        }}
        aria-label="Tap to set tempo"
        className="border-line-strong bg-surface-sunken text-ink hover:border-accent hover:text-accent active:bg-surface-raised flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3.5 text-sm font-semibold tracking-[0.12em] uppercase transition-colors"
      >
        <Hand aria-hidden className="size-4" />
        Tap
      </button>
    </div>
  )
}
