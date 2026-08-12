import { SOUND_PRESETS } from '../audio/ClickGenerator'
import type { SoundId } from '../types/metronome'

interface SoundSelectorProps {
  label: string
  value: SoundId
  onChange: (sound: SoundId) => void
}

/**
 * Click voice picker. A native select keeps the settings panel compact and
 * gives mobile users the platform picker they already know.
 */
export function SoundSelector({ label, value, onChange }: SoundSelectorProps) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-ink text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SoundId)}
        className="bg-surface-sunken border-line text-ink focus-visible:border-accent min-w-32 rounded-lg border px-3 py-1.5 text-sm"
      >
        {SOUND_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  )
}
