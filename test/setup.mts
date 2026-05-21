/**
 * @file Vitest setup file for test utilities.
 */

import process from 'node:process'

// Disable debug output during tests
process.env['DEBUG'] = ''
delete process.env['NODE_DEBUG']

// Mock complex initialization chains to prevent coverage mode issues
// This avoids problems with abort-signal/signal-exit during module loading
import { vi } from 'vitest'

// Mock signal-exit to prevent issues during coverage
vi.mock('@socketsecurity/lib/signal-exit/register', () => ({
  onExit: vi.fn(() => vi.fn()),
}))
vi.mock('@socketsecurity/lib/signal-exit/lifecycle', () => ({
  load: vi.fn(),
  unload: vi.fn(),
}))
vi.mock('@socketsecurity/lib/signal-exit/signals', () => ({
  signals: vi.fn(() => []),
}))
