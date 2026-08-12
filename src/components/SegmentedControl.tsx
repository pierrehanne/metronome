interface Option<T extends string> {
  value: T
  label: string
  hint?: string
}

interface SegmentedControlProps<T extends string> {
  label: string
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
  /** Renders each option's label in the mono face, for note-value glyphs. */
  mono?: boolean
}

/**
 * Radio group styled as a segmented control.
 *
 * Built from real radio inputs rather than buttons so arrow-key navigation and
 * screen-reader grouping come from the platform instead of being reimplemented.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  mono = false,
}: SegmentedControlProps<T>) {
  return (
    <fieldset>
      <legend className="label-eyebrow mb-2">{label}</legend>
      <div className="bg-surface-sunken border-line grid auto-cols-fr grid-flow-col gap-1 rounded-lg border p-1">
        {options.map((option) => {
          const checked = option.value === value
          return (
            <label
              key={option.value}
              title={option.hint ?? option.label}
              className={[
                'flex cursor-pointer items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                mono ? 'font-mono' : '',
                checked
                  ? 'bg-accent text-accent-ink'
                  : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
              ].join(' ')}
            >
              <input
                type="radio"
                name={`segmented-${label}`}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
