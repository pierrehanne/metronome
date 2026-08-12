# Metronome

A precise, keyboard-friendly metronome for daily practice. Runs entirely in the browser — no backend, no account, no network after the first visit.

Timing comes from the Web Audio API clock via a look-ahead scheduler, so the pulse stays steady even when the main thread is busy.

## Features

- **Tempo** — 20–300 BPM, with a slider, press-and-hold ± buttons, direct numeric entry and keyboard control
- **Tap tempo** — averages your taps and ignores long pauses, so you can stop and re-tap
- **Time signatures** — 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8, with grouping accents for odd and compound meters
- **Subdivisions** — quarters, 8ths, 8th triplets and 16ths, all derived from the main tempo
- **Swing** — 50–75%, applied to even subdivisions
- **Six click voices** — synthesized at runtime and cached; no audio files to download
- **Accents** — a distinct voice on beat 1, with independent sound selection
- **Beat visualization** — dots aligned to the audio clock, not to when clicks were queued
- **Themes** — Dark, OLED and Light
- **Persistence** — preferences saved to `localStorage`
- **Installable** — works offline as a PWA
- **Accessible** — full keyboard control, visible focus, ARIA labels, no state signalled by colour alone

## Keyboard shortcuts

| Key             | Action       |
| --------------- | ------------ |
| `Space`         | Start / Stop |
| `↑` `↓`         | Tempo ±1     |
| `Shift` + `↑ ↓` | Tempo ±5     |
| `Alt` + `↑ ↓`   | Tempo ±0.1   |
| `T`             | Tap tempo    |
| `M`             | Mute         |
| `R`             | Reset to 120 |

Shortcuts are suppressed while a text field has focus, and can be turned off in Settings.

## Development

```bash
npm install
npm run dev
```

| Script             | Purpose                            |
| ------------------ | ---------------------------------- |
| `npm run dev`      | Dev server with hot reload         |
| `npm run build`    | Typecheck and build to `dist/`     |
| `npm run preview`  | Serve the production build locally |
| `npm run test`     | Unit and component tests (Vitest)  |
| `npm run test:e2e` | End-to-end tests (Playwright)      |
| `npm run lint`     | ESLint                             |
| `npm run format`   | Prettier                           |

## Architecture

The audio engine is independent of React: no component re-render can affect timing.

```
src/
├── audio/
│   ├── AudioEngine.ts         AudioContext, master gain, click playback
│   ├── ClickGenerator.ts      Synthesizes and caches click buffers
│   └── MetronomeScheduler.ts  Look-ahead scheduler (no Web Audio, no React)
├── components/                Presentational UI
├── hooks/
│   ├── useMetronome.ts        Bridges engine ↔ React
│   ├── useTapTempo.ts
│   └── useKeyboardShortcuts.ts
├── store/settingsStore.ts     Zustand + localStorage persistence
├── types/metronome.ts         Domain types, time signatures, subdivisions
└── utils/                     Pure tempo and rhythm math
```

### How the pieces fit together

Settings flow one way — store to scheduler to speakers. The only thing flowing back into React is which beat is currently audible.

```mermaid
flowchart TB
    subgraph ui["UI — React (re-renders freely)"]
        components["components/<br/>BPMControls, PlayButton,<br/>TimeSignatureSelector, SettingsPanel…"]
        indicator["BeatIndicator"]
    end

    subgraph state["State"]
        store["settingsStore<br/><i>Zustand</i>"]
        ls[("localStorage")]
    end

    subgraph bridge["Bridge"]
        useMetronome["useMetronome"]
    end

    subgraph audio["Audio — no React (timing-critical)"]
        scheduler["MetronomeScheduler<br/><i>look-ahead, pure logic</i>"]
        engine["AudioEngine<br/><i>AudioContext + master gain</i>"]
        generator["ClickGenerator<br/><i>synthesized buffer cache</i>"]
        speakers(["🔊 Output"])
    end

    components -->|"actions"| store
    store <-->|"persist"| ls
    store -->|"bpm, meter, subdivision,<br/>swing, accents"| useMetronome
    useMetronome -->|"updateConfig"| scheduler
    scheduler -->|"ScheduledClick<br/>{time, beat, tick, level}"| useMetronome
    useMetronome -->|"playClick(sound, level, time)"| engine
    engine -->|"get(sound, level)"| generator
    engine --> speakers
    engine -.->|"currentTime<br/><i>clock</i>"| scheduler
    useMetronome -->|"currentBeat<br/><i>rAF vs audio clock</i>"| indicator

    classDef reactBox fill:#1e3a5f,stroke:#4a90d9,color:#fff
    classDef audioBox fill:#3d2645,stroke:#b07cc6,color:#fff
    classDef stateBox fill:#1f3d2b,stroke:#5cb87a,color:#fff
    class components,indicator reactBox
    class scheduler,engine,generator,speakers audioBox
    class store,ls stateBox
```

**How the timing works.** A coarse `setInterval` wakes the scheduler about every 25 ms, and it queues every click falling within the next 120 ms against the `AudioContext` clock. Each click's time is computed from the start of the measure rather than from the previous click, so jitter in the timer cannot accumulate into drift — the timer decides only _when we look ahead_, never _when a click sounds_.

```mermaid
sequenceDiagram
    participant T as setInterval<br/>(every ~25 ms)
    participant S as MetronomeScheduler
    participant H as useMetronome
    participant E as AudioEngine
    participant R as requestAnimationFrame

    T->>S: scheduleWindow()
    Note over S: horizon = now() + 120 ms
    loop while nextClickTime < horizon
        S->>H: emit(ScheduledClick)
        H->>E: playClick(sound, level, time)
        Note over E: source.start(time)<br/>queued on the audio clock
        H->>H: if tick == 0, push<br/>{beat, audibleAt}
    end
    Note over S: beatStartTime += beatDuration<br/>anchored to the measure, so<br/>timer jitter cannot drift

    R->>H: frame
    H->>E: currentTime
    H-->>H: promote beats where<br/>audibleAt <= now → setBeat
    Note over R,H: dots track what is heard,<br/>not what was queued
```

`MetronomeScheduler` takes a clock function and an emit callback instead of touching Web Audio directly, which makes its timing directly testable: `MetronomeScheduler.test.ts` drives it with a controllable clock and asserts sample-exact intervals over long runs and irregular wake-ups.

## Adding to the app

- **A time signature** — add an entry to `TIME_SIGNATURES` in `src/types/metronome.ts`. The selector, scheduler and beat indicator all read from that list.
- **A subdivision** — add an entry to `SUBDIVISIONS` in the same file.
- **A click sound** — add a `SoundPreset` and a matching `Recipe` in `src/audio/ClickGenerator.ts`.

## Deployment

Pushing to `main` runs lint, tests and the build, then deploys `dist/` to GitHub Pages via `.github/workflows/deploy.yml`. Enable it once under **Settings → Pages → Source → GitHub Actions**.

```mermaid
flowchart LR
    push["push / PR<br/>to main"] --> verify & e2e

    subgraph verify["verify"]
        v1["format:check"] --> v2["lint"] --> v3["test<br/><i>Vitest</i>"] --> v4["build<br/><i>tsc -b + vite</i>"]
    end

    subgraph e2e["e2e"]
        p1["install chromium"] --> p2["test:e2e<br/><i>Playwright</i>"]
    end

    verify -->|"artifact: dist/"| deploy
    e2e --> deploy
    deploy{{"deploy<br/><i>main only</i>"}} --> pages(["GitHub Pages"])

    classDef gate fill:#1e3a5f,stroke:#4a90d9,color:#fff
    classDef ship fill:#1f3d2b,stroke:#5cb87a,color:#fff
    class v1,v2,v3,v4,p1,p2 gate
    class deploy,pages ship
```

Both jobs run in parallel on every push and pull request; a failure in either blocks the deploy. Pull requests stop after verification — only `main` uploads the artifact and publishes.

GitHub Pages serves project sites from a subpath, so the build takes its base path from `VITE_BASE_PATH` (the workflow sets it to the repository name; it defaults to `/metronome/`). For a custom domain or user site, build with `VITE_BASE_PATH=/`:

```bash
VITE_BASE_PATH=/ npm run build
```

## Browser support

Any current browser with Web Audio: Chrome, Edge, Firefox and Safari, on desktop and mobile. Audio starts on your first interaction, as browsers require.

## License

MIT — see [LICENSE](LICENSE).
