import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ThemeId } from '../types/metronome'
import { useSettingsStore } from '../store/settingsStore'
import { getSubdivision, supportsSwing } from '../utils/rhythm'
import { SegmentedControl } from './SegmentedControl'
import { SoundSelector } from './SoundSelector'
import { SwingControl } from './SwingControl'
import { Toggle } from './Toggle'
import { VolumeControl } from './VolumeControl'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

const THEME_OPTIONS = [
  { value: 'dark' as ThemeId, label: 'Dark' },
  { value: 'oled' as ThemeId, label: 'OLED' },
  { value: 'light' as ThemeId, label: 'Light' },
] as const

const SHORTCUTS: readonly { key: string; action: string }[] = [
  { key: 'Space', action: 'Start / Stop' },
  { key: '↑ ↓', action: 'Tempo ±1' },
  { key: 'Shift + ↑ ↓', action: 'Tempo ±5' },
  { key: 'T', action: 'Tap tempo' },
  { key: 'M', action: 'Mute' },
  { key: 'R', action: 'Reset tempo' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-line border-t px-5 py-5 first:border-t-0">
      <h3 className="label-eyebrow mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

/**
 * Slide-over settings drawer.
 *
 * Implemented as a modal dialog: focus moves in on open, Escape closes, and
 * focus returns to whatever opened it.
 */
export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  const store = useSettingsStore()
  const swingAvailable = supportsSwing(getSubdivision(store.subdivision).ticksPerBeat)

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      restoreFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop; presentational, since Escape and the close button both exit. */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="bg-surface border-line relative flex h-full w-full max-w-sm flex-col overflow-y-auto border-l shadow-2xl"
      >
        <header className="bg-surface border-line sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="border-line text-ink-muted hover:border-line-strong hover:text-ink flex size-9 items-center justify-center rounded-lg border transition-colors"
          >
            <X aria-hidden className="size-4" />
          </button>
        </header>

        <Section title="Audio">
          <SoundSelector
            label="Click sound"
            value={store.sound}
            onChange={store.setSound}
          />
          <SoundSelector
            label="Accent sound"
            value={store.accentSound}
            onChange={store.setAccentSound}
          />
          <VolumeControl
            volume={store.volume}
            muted={store.muted}
            onChange={store.setVolume}
            onToggleMute={store.toggleMuted}
          />
          <Toggle
            label="Accent first beat"
            hint="Play a stronger click on beat 1"
            checked={store.accentEnabled}
            onChange={store.setAccentEnabled}
          />
        </Section>

        <Section title="Rhythm">
          <SwingControl
            swing={store.swing}
            onChange={store.setSwing}
            enabled={swingAvailable}
          />
        </Section>

        <Section title="Interface">
          <SegmentedControl
            label="Theme"
            options={THEME_OPTIONS}
            value={store.theme}
            onChange={store.setTheme}
          />
          <Toggle
            label="Visual beat animation"
            hint="Animate the beat indicator"
            checked={store.beatAnimation}
            onChange={store.setBeatAnimation}
          />
          <Toggle
            label="Keyboard shortcuts"
            hint="Space, arrows, T, M, R"
            checked={store.shortcutsEnabled}
            onChange={store.setShortcutsEnabled}
          />
        </Section>

        <Section title="Shortcuts">
          <dl className="space-y-2">
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.key} className="flex items-center justify-between gap-4">
                <dt className="text-ink-muted text-sm">{shortcut.action}</dt>
                <dd>
                  <kbd className="bg-surface-sunken border-line text-ink-muted rounded border px-2 py-0.5 font-mono text-xs">
                    {shortcut.key}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  )
}
