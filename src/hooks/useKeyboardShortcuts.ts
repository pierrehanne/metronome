import { useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'

export interface KeyboardShortcutHandlers {
  onToggle: () => void
  onTap: () => void
}

/** True when the event originated in a field where typing should win. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    // Range and checkbox inputs have their own arrow/space handling, but they
    // are not text entry, so shortcuts may still apply elsewhere.
    const type = (target as HTMLInputElement).type
    return type !== 'range' && type !== 'checkbox' && type !== 'radio' && type !== 'button'
  }
  return false
}

/**
 * Global keyboard shortcuts, per the spec:
 * Space start/stop, arrows tempo, T tap, M mute, R reset.
 *
 * Shift with an arrow gives a coarse ±5 BPM jump; Alt gives a fine ±0.1.
 */
export function useKeyboardShortcuts({ onToggle, onTap }: KeyboardShortcutHandlers): void {
  const enabled = useSettingsStore((state) => state.shortcutsEnabled)

  useEffect(() => {
    if (!enabled) return

    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) return
      if (isTextEntry(event.target)) return

      const store = useSettingsStore.getState()
      const step = event.shiftKey ? 5 : event.altKey ? 0.1 : 1

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault()
          onToggle()
          break
        case 'ArrowUp':
          event.preventDefault()
          store.nudgeBpm(step)
          break
        case 'ArrowDown':
          event.preventDefault()
          store.nudgeBpm(-step)
          break
        case 'ArrowRight':
          event.preventDefault()
          store.nudgeBpm(step)
          break
        case 'ArrowLeft':
          event.preventDefault()
          store.nudgeBpm(-step)
          break
        default:
          switch (event.key.toLowerCase()) {
            case 't':
              event.preventDefault()
              onTap()
              break
            case 'm':
              event.preventDefault()
              store.toggleMuted()
              break
            case 'r':
              event.preventDefault()
              store.resetBpm()
              break
            default:
              break
          }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, onTap, onToggle])
}
