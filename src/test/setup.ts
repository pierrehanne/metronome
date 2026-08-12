// Must come first: the settings store resolves its persist storage at module
// evaluation time, so localStorage has to exist before that import runs.
import './memoryStorage'

import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { STORAGE_KEY } from '../store/settingsStore'

afterEach(() => {
  cleanup()
  // Persisted settings would otherwise leak between tests.
  localStorage.removeItem(STORAGE_KEY)
})
