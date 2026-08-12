import { Volume1, Volume2, VolumeX } from 'lucide-react'

interface VolumeControlProps {
  volume: number
  muted: boolean
  onChange: (volume: number) => void
  onToggleMute: () => void
}

export function VolumeControl({
  volume,
  muted,
  onChange,
  onToggleMute,
}: VolumeControlProps) {
  const percent = Math.round(volume * 100)
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label-eyebrow">Volume</span>
        <span className="text-ink-muted tabular text-xs">
          {muted ? 'Muted' : `${percent}%`}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className={[
            'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
            muted
              ? 'border-danger text-danger'
              : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
          ].join(' ')}
        >
          <Icon aria-hidden className="size-4" />
        </button>

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          onChange={(event) => onChange(Number(event.target.value) / 100)}
          aria-label="Master volume"
          aria-valuetext={`${percent} percent`}
          // Dimmed while muted to show the slider is not currently in effect.
          className={`slider ${muted ? 'opacity-40' : ''}`}
        />
      </div>
    </div>
  )
}
