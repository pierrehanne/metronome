/**
 * Installs an in-memory Storage as `localStorage` when the environment has none.
 *
 * Node 26 exposes a built-in `localStorage` global that is disabled unless the
 * runtime is started with --localstorage-file, and it shadows the jsdom
 * implementation, so persistence tests would otherwise fail on a missing API.
 *
 * This module must be imported before anything that reads `localStorage` at
 * module scope — notably the settings store, whose persist middleware resolves
 * its storage when the module is first evaluated.
 */
function installMemoryStorage(): void {
  if (typeof window === 'undefined') return

  const existing = (() => {
    try {
      return window.localStorage
    } catch {
      return undefined
    }
  })()
  if (existing) return

  const store = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(String(key)) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(String(key))
    },
    setItem: (key, value) => {
      store.set(String(key), String(value))
    },
  }

  for (const target of [window, globalThis]) {
    Object.defineProperty(target, 'localStorage', {
      configurable: true,
      get: () => storage,
    })
  }
}

installMemoryStorage()
