import { SWING_MAX, SWING_MIN } from '../types/metronome'

interface SwingControlProps {
  swing: number
  onChange: (swing: number) => void
  /** False for triplets, where swing has no meaning. */
  enabled: boolean
}

/** Short description of what the current ratio sounds like. */
function swingFeel(swing: number): string {
  if (swing <= SWING_MIN) return 'Straight'
  if (swing < 60) return 'Light'
  if (swing < 68) return 'Triplet feel'
  if (swing < 73) return 'Hard swing'
  return 'Dotted'
}

export function SwingControl({ swing, onChange, enabled }: SwingControlProps) {
  return (
    <div className={enabled ? '' : 'opacity-50'}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label-eyebrow">Swing</span>
        <span className="text-ink-muted tabular text-xs">
          {enabled ? `${swing}% · ${swingFeel(swing)}` : 'Even subdivisions only'}
        </span>
      </div>

      <input
        type="range"
        min={SWING_MIN}
        max={SWING_MAX}
        step={1}
        value={swing}
        disabled={!enabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Swing amount"
        aria-valuetext={`${swing} percent, ${swingFeel(swing)}`}
        className="slider disabled:cursor-not-allowed"
      />
      <div className="text-ink-subtle tabular flex justify-between text-[0.6875rem]">
        <span>{SWING_MIN}%</span>
        <span>{SWING_MAX}%</span>
      </div>
    </div>
  )
}
