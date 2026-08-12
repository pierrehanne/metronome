import { SUBDIVISIONS, type SubdivisionId } from '../types/metronome'

interface SubdivisionSelectorProps {
  value: SubdivisionId
  onChange: (id: SubdivisionId) => void
}

/** Dot pattern illustrating how many clicks fall inside one beat. */
function SubdivisionGlyph({ ticks, active }: { ticks: number; active: boolean }) {
  return (
    <span aria-hidden className="flex items-center gap-[3px]">
      {Array.from({ length: ticks }, (_, index) => (
        <span
          key={index}
          className={[
            'rounded-full',
            // The first dot of the group is the beat, so it reads heavier.
            index === 0 ? 'size-[5px]' : 'size-[3px]',
            active ? 'bg-accent-ink' : 'bg-ink-muted',
          ].join(' ')}
        />
      ))}
    </span>
  )
}

export function SubdivisionSelector({ value, onChange }: SubdivisionSelectorProps) {
  return (
    <fieldset>
      <legend className="label-eyebrow mb-2">Subdivision</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {SUBDIVISIONS.map((subdivision) => {
          const checked = subdivision.id === value
          return (
            <label
              key={subdivision.id}
              title={subdivision.label}
              className={[
                'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 transition-colors',
                checked
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line bg-surface-sunken text-ink-muted hover:border-line-strong hover:text-ink',
              ].join(' ')}
            >
              <input
                type="radio"
                name="subdivision"
                value={subdivision.id}
                checked={checked}
                onChange={() => onChange(subdivision.id)}
                className="sr-only"
              />
              <SubdivisionGlyph ticks={subdivision.ticksPerBeat} active={checked} />
              {/* The abbreviated text is decorative; the full label names the
                  option for assistive technology. */}
              <span
                aria-hidden
                className="text-[0.625rem] font-semibold tracking-wide uppercase"
              >
                {subdivision.label.replace(' Notes', '').replace('8th ', '')}
              </span>
              <span className="sr-only">{subdivision.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
