import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine } from '../audio/AudioEngine'
import {
  MetronomeScheduler,
  SCHEDULER_INTERVAL_MS,
  type SchedulerConfig,
} from '../audio/MetronomeScheduler'
import type { ScheduledClick } from '../types/metronome'
import { useSettingsStore } from '../store/settingsStore'

/** A beat the UI should highlight, plus when it becomes audible. */
interface PendingBeat {
  beat: number
  /** AudioContext time at which the click reaches the speakers. */
  audibleAt: number
}

export interface UseMetronomeResult {
  /** Beat currently sounding, or null while stopped. */
  currentBeat: number | null
  /** Set if audio could not be started (unsupported browser, blocked context). */
  audioError: string | null
  start: () => void
  stop: () => void
  toggle: () => void
}

/**
 * Connects the audio engine and scheduler to the React tree.
 *
 * The engine and scheduler live in refs and are never recreated by renders.
 * Settings flow one way — store to scheduler — and the only thing flowing back
 * is the beat currently being heard.
 */
export function useMetronome(): UseMetronomeResult {
  const engineRef = useRef<AudioEngine | null>(null)
  const schedulerRef = useRef<MetronomeScheduler | null>(null)
  const timerRef = useRef<number | null>(null)
  /** Beats scheduled but not yet audible, in chronological order. */
  const pendingRef = useRef<PendingBeat[]>([])

  const [beat, setBeat] = useState<number | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)

  const isPlaying = useSettingsStore((state) => state.isPlaying)
  const setPlaying = useSettingsStore((state) => state.setPlaying)

  // Settings are read individually so an unrelated change cannot re-run the
  // effects below.
  const bpm = useSettingsStore((state) => state.bpm)
  const timeSignature = useSettingsStore((state) => state.timeSignature)
  const subdivision = useSettingsStore((state) => state.subdivision)
  const swing = useSettingsStore((state) => state.swing)
  const accentEnabled = useSettingsStore((state) => state.accentEnabled)
  const volume = useSettingsStore((state) => state.volume)
  const muted = useSettingsStore((state) => state.muted)
  const sound = useSettingsStore((state) => state.sound)
  const accentSound = useSettingsStore((state) => state.accentSound)

  /**
   * Live settings for the audio callbacks.
   *
   * The scheduler runs outside React and must always see current values without
   * being rebuilt, so the callbacks read this ref rather than closing over
   * individual settings.
   */
  const liveRef = useRef({ sound, accentSound })

  useEffect(() => {
    liveRef.current = { sound, accentSound }
  }, [sound, accentSound])

  const getEngine = useCallback((): AudioEngine => {
    engineRef.current ??= new AudioEngine()
    return engineRef.current
  }, [])

  /** Play a scheduled click and queue its beat for visual highlighting. */
  const handleClick = useCallback(
    (click: ScheduledClick) => {
      const engine = getEngine()
      const { sound: clickSound, accentSound: accentPreset } = liveRef.current
      engine.playClick(
        click.level === 'accent' ? accentPreset : clickSound,
        click.level,
        click.time,
      )

      // Only the beat itself moves the indicator; subdivisions do not.
      if (click.tick === 0) {
        pendingRef.current.push({
          beat: click.beat,
          audibleAt: click.time + engine.outputLatency,
        })
      }
    },
    [getEngine],
  )

  /** Tear down the scheduling loop. Deliberately free of React state. */
  const stopTransport = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    schedulerRef.current?.stop()
    pendingRef.current = []
  }, [])

  // The store's isPlaying flag is the single source of truth for the transport;
  // every entry point (button, keyboard, tests) just flips it.
  useEffect(() => {
    if (!isPlaying) return

    const engine = getEngine()
    let cancelled = false

    void engine
      .resume()
      .then((context) => {
        // The user may have stopped again before the context finished resuming.
        if (cancelled) return

        if (!context) {
          setAudioError('Web Audio is not available in this browser.')
          setPlaying(false)
          return
        }

        setAudioError(null)
        // Clear any beat left over from the previous run before the first click.
        setBeat(null)

        const { sound: clickSound, accentSound: accentPreset } = liveRef.current
        engine.prewarm(clickSound)
        engine.prewarm(accentPreset)

        // Read settings at start time so a change mid-resume is not missed.
        const store = useSettingsStore.getState()
        const config: SchedulerConfig = {
          bpm: store.bpm,
          timeSignature: store.timeSignature,
          subdivision: store.subdivision,
          swing: store.swing,
          accentEnabled: store.accentEnabled,
        }

        schedulerRef.current ??= new MetronomeScheduler(
          () => engine.currentTime,
          handleClick,
          config,
        )
        const scheduler = schedulerRef.current
        scheduler.updateConfig(config)

        // start() is idempotent, so a burst of clicks cannot double-schedule.
        if (scheduler.isRunning) return

        pendingRef.current = []
        scheduler.start()

        timerRef.current = window.setInterval(() => {
          scheduler.scheduleWindow()
        }, SCHEDULER_INTERVAL_MS)
      })
      .catch(() => {
        if (cancelled) return
        setAudioError('Could not start audio playback.')
        setPlaying(false)
      })

    return () => {
      cancelled = true
      stopTransport()
    }
  }, [isPlaying, getEngine, handleClick, setPlaying, stopTransport])

  /**
   * Advance the visual indicator to the latest beat that has become audible.
   *
   * Driven by requestAnimationFrame and compared against the audio clock, so
   * the dots track the sound the user hears rather than the moment a click was
   * queued — this is what keeps the visuals in sync with the scheduler.
   */
  useEffect(() => {
    if (!isPlaying) return

    let frame = requestAnimationFrame(function tick() {
      const engine = engineRef.current
      if (engine) {
        const now = engine.currentTime
        const pending = pendingRef.current
        let next: number | null = null

        while (pending.length > 0 && pending[0]!.audibleAt <= now) {
          next = pending.shift()!.beat
        }
        if (next !== null) setBeat(next)
      }
      frame = requestAnimationFrame(tick)
    })

    return () => cancelAnimationFrame(frame)
  }, [isPlaying])

  // Live settings updates, applied without interrupting playback.
  useEffect(() => {
    schedulerRef.current?.updateConfig({
      bpm,
      timeSignature,
      subdivision,
      swing,
      accentEnabled,
    })
  }, [bpm, timeSignature, subdivision, swing, accentEnabled])

  useEffect(() => {
    engineRef.current?.setVolume(volume)
  }, [volume])

  useEffect(() => {
    engineRef.current?.setMuted(muted)
  }, [muted])

  useEffect(() => {
    if (engineRef.current?.isInitialized) {
      engineRef.current.prewarm(sound)
      engineRef.current.prewarm(accentSound)
    }
  }, [sound, accentSound])

  // Release the audio hardware when the app unmounts.
  useEffect(
    () => () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
      void engineRef.current?.close()
      engineRef.current = null
      schedulerRef.current = null
    },
    [],
  )

  const start = useCallback(() => setPlaying(true), [setPlaying])
  const stop = useCallback(() => setPlaying(false), [setPlaying])
  const toggle = useCallback(() => {
    setPlaying(!useSettingsStore.getState().isPlaying)
  }, [setPlaying])

  return {
    // Derived rather than cleared on stop, so stopping needs no state update
    // and a stale beat can never linger on screen.
    currentBeat: isPlaying ? beat : null,
    audioError,
    start,
    stop,
    toggle,
  }
}
