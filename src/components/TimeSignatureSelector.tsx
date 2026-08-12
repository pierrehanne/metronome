import { TIME_SIGNATURES, type TimeSignatureId } from '../types/metronome'

interface TimeSignatureSelectorProps {
  value: TimeSignatureId
  onChange: (id: TimeSignatureId) => void
}

/**
 * Time signature picker.
 *
 * A grid rather than a dropdown: every option is one tap away, and the list is
 * driven by TIME_SIGNATURES so adding a meter needs no change here.
 */
export function TimeSignatureSelector({ value, onChange }: TimeSignatureSelectorProps) {
  return (
    <fieldset>
      <legend className="label-eyebrow mb-2">Time Signature</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {TIME_SIGNATURES.map((signature) => {
          const checked = signature.id === value
          return (
            <label
              key={signature.id}
              className={[
                'flex cursor-pointer items-center justify-center rounded-lg border py-2.5 font-mono text-sm font-semibold transition-colors',
                checked
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line bg-surface-sunken text-ink-muted hover:border-line-strong hover:text-ink',
              ].join(' ')}
            >
              <input
                type="radio"
                name="time-signature"
                value={signature.id}
                checked={checked}
                onChange={() => onChange(signature.id)}
                className="sr-only"
              />
              <span aria-hidden>{signature.label}</span>
              <span className="sr-only">
                {signature.beats} beats per measure, {signature.label}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
