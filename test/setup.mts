/** @fileoverview Vitest setup file for test utilities. */

// Disable debug output during tests
process.env['DEBUG'] = ''
delete process.env['NODE_DEBUG']

// Mock complex initialization chains to prevent coverage mode issues
// This avoids problems with abort-signal/signal-exit during module loading
import { vi } from 'vitest'

// Mock signal-exit to prevent issues during coverage
vi.mock('@socketsecurity/registry/lib/signal-exit', () => ({
  onExit: vi.fn(),
}))
