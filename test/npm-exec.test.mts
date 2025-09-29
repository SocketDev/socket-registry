import { describe, expect, it } from 'vitest'

import { isPnpmIgnoreScriptsFlag } from '../registry/dist/lib/agent.js'

// Note: execPnpm integration testing would require mocking the spawn/execBin functions.
// which is complex due to the module structure. The implementation can be tested.
// through integration tests with actual pnpm commands.

describe('isPnpmIgnoreScriptsFlag', () => {
  it('should recognize --ignore-scripts flag', () => {
    expect(isPnpmIgnoreScriptsFlag('--ignore-scripts')).toBe(true)
  })

  it('should recognize --no-ignore-scripts flag', () => {
    expect(isPnpmIgnoreScriptsFlag('--no-ignore-scripts')).toBe(true)
  })

  it('should not recognize other flags', () => {
    expect(isPnpmIgnoreScriptsFlag('--install')).toBe(false)
    expect(isPnpmIgnoreScriptsFlag('--force')).toBe(false)
    expect(isPnpmIgnoreScriptsFlag('--audit')).toBe(false)
    expect(isPnpmIgnoreScriptsFlag('')).toBe(false)
  })

  it('should not recognize partial matches', () => {
    expect(isPnpmIgnoreScriptsFlag('--ignore')).toBe(false)
    expect(isPnpmIgnoreScriptsFlag('--scripts')).toBe(false)
    expect(isPnpmIgnoreScriptsFlag('ignore-scripts')).toBe(false)
  })
})
