interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
}

/**
 * Switch built on a real checkbox, so it is focusable and announces its state
 * without any ARIA of its own.
 */
export function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="text-ink block text-sm font-medium">{label}</span>
        {hint ? <span className="text-ink-subtle block text-xs">{hint}</span> : null}
      </span>

      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={[
            'block h-6 w-11 rounded-full border transition-colors',
            'peer-focus-visible:ring-accent peer-focus-visible:ring-offset-surface peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
            checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface-sunken',
          ].join(' ')}
        />
        <span
          aria-hidden
          className={[
            'pointer-events-none absolute top-1 size-4 rounded-full transition-all',
            checked ? 'bg-accent-ink left-6' : 'bg-ink-muted left-1',
          ].join(' ')}
        />
      </span>
    </label>
  )
}
