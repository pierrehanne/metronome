import { Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BeatIndicator } from './components/BeatIndicator'
import { BPMControls } from './components/BPMControls'
import { BPMDisplay } from './components/BPMDisplay'
import { PlayButton } from './components/PlayButton'
import { SettingsPanel } from './components/SettingsPanel'
import { SubdivisionSelector } from './components/SubdivisionSelector'
import { TapTempo } from './components/TapTempo'
import { TimeSignatureSelector } from './components/TimeSignatureSelector'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMetronome } from './hooks/useMetronome'
import { useTapTempo } from './hooks/useTapTempo'
import { useSettingsStore } from './store/settingsStore'
import { getTimeSignature } from './utils/rhythm'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const bpm = useSettingsStore((state) => state.bpm)
  const isPlaying = useSettingsStore((state) => state.isPlaying)
  const timeSignature = useSettingsStore((state) => state.timeSignature)
  const subdivision = useSettingsStore((state) => state.subdivision)
  const accentEnabled = useSettingsStore((state) => state.accentEnabled)
  const beatAnimation = useSettingsStore((state) => state.beatAnimation)
  const theme = useSettingsStore((state) => state.theme)
  const setBpm = useSettingsStore((state) => state.setBpm)
  const nudgeBpm = useSettingsStore((state) => state.nudgeBpm)
  const setTimeSignature = useSettingsStore((state) => state.setTimeSignature)
  const setSubdivision = useSettingsStore((state) => state.setSubdivision)

  const { currentBeat, audioError, toggle } = useMetronome()
  const { tap, tappedBpm, tapCount } = useTapTempo()

  useKeyboardShortcuts({ onToggle: toggle, onTap: tap })

  // Themes are applied on the root element so the CSS variables cascade to
  // everything, including the browser's own form-control rendering.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark'
  }, [theme])

  const signature = getTimeSignature(timeSignature)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold tracking-[0.18em] uppercase">Metronome</h1>
          <span
            aria-hidden
            className={`size-1.5 rounded-full transition-colors ${
              isPlaying ? 'bg-beat' : 'bg-line-strong'
            }`}
          />
        </div>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="border-line text-ink-muted hover:border-line-strong hover:text-ink flex size-9 items-center justify-center rounded-lg border transition-colors"
        >
          <Settings aria-hidden className="size-4" />
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-7 px-5 py-7 sm:gap-8">
        {audioError ? (
          <p
            role="alert"
            className="border-danger text-danger rounded-lg border border-dashed px-4 py-3 text-sm"
          >
            {audioError}
          </p>
        ) : null}

        {/* Tempo and transport: the visual centre of the app. */}
        <section
          className="flex flex-col items-center gap-7"
          aria-label="Tempo and transport"
        >
          <BeatIndicator
            signature={signature}
            currentBeat={currentBeat}
            accentEnabled={accentEnabled}
            animate={beatAnimation}
          />
          <BPMDisplay bpm={bpm} onChange={setBpm} />
          <BPMControls bpm={bpm} onNudge={nudgeBpm} onChange={setBpm} />
          <PlayButton isPlaying={isPlaying} onToggle={toggle} />
        </section>

        {/* Rhythm setup, side by side once there is room for it. */}
        <section className="panel grid gap-5 p-5 sm:grid-cols-2" aria-label="Rhythm">
          <TimeSignatureSelector value={timeSignature} onChange={setTimeSignature} />
          <SubdivisionSelector value={subdivision} onChange={setSubdivision} />
        </section>

        <section className="panel p-5" aria-label="Tap tempo">
          <TapTempo onTap={tap} tappedBpm={tappedBpm} tapCount={tapCount} />
        </section>
      </main>

      <footer className="text-ink-subtle mx-auto w-full max-w-2xl px-5 pb-5 text-center text-xs">
        <span className="hidden sm:inline">
          Space to start · ↑ ↓ tempo · T to tap · M to mute · R to reset
        </span>
        <span className="sm:hidden">Tap the tempo to type a value</span>
      </footer>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
