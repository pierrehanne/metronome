import { useEffect, useRef, useState } from 'react'
import { BPM_MAX, BPM_MIN } from '../types/metronome'
import { clampBpm } from '../utils/tempo'

interface BPMDisplayProps {
  bpm: number
  onChange: (bpm: number) => void
}

/** Descriptive tempo marking, shown as a secondary cue under the number. */
function tempoMarking(bpm: number): string {
  if (bpm < 40) return 'Grave'
  if (bpm < 60) return 'Largo'
  if (bpm < 66) return 'Larghetto'
  if (bpm < 76) return 'Adagio'
  if (bpm < 108) return 'Andante'
  if (bpm <= 120) return 'Moderato'
  if (bpm < 156) return 'Allegro'
  if (bpm < 176) return 'Vivace'
  if (bpm < 200) return 'Presto'
  return 'Prestissimo'
}

/**
 * The primary readout. Doubles as a numeric input: clicking the number turns it
 * into a text field, which keeps direct entry available without spending screen
 * space on a permanent input box.
 */
export function BPMDisplay({ bpm, onChange }: BPMDisplayProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const beginEdit = () => {
    setDraft(String(Math.round(bpm)))
    setEditing(true)
  }

  const commit = () => {
    const parsed = Number.parseFloat(draft)
    if (Number.isFinite(parsed)) onChange(clampBpm(parsed))
    setEditing(false)
  }

  // Whole numbers display without a decimal; fine adjustment shows one place.
  const display = Number.isInteger(bpm) ? String(bpm) : bpm.toFixed(1)

  return (
    <div className="flex flex-col items-center">
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={BPM_MIN}
          max={BPM_MAX}
          value={draft}
          aria-label="Tempo in beats per minute"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') setEditing(false)
            // Let the field own its arrow keys instead of the global shortcuts.
            event.stopPropagation()
          }}
          className="bg-surface-sunken border-line-strong tabular w-[5.5ch] [appearance:textfield] rounded-lg border text-center text-7xl leading-none font-semibold sm:text-8xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <button
          type="button"
          onClick={beginEdit}
          aria-label={`Tempo ${display} beats per minute. Activate to type a value.`}
          className="tabular hover:text-accent rounded-lg text-7xl leading-none font-semibold tracking-tight transition-colors sm:text-8xl"
        >
          {display}
        </button>
      )}

      <div className="mt-2 flex items-baseline gap-2">
        <span className="label-eyebrow">BPM</span>
        <span aria-hidden className="text-line-strong">
          ·
        </span>
        <span className="text-ink-muted text-xs italic">{tempoMarking(bpm)}</span>
      </div>
    </div>
  )
}
