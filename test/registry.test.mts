/**
 * @fileoverview Tests for @socketsecurity/registry package.
 */

import { describe, expect, it } from 'vitest'

import * as registry from '../registry/src/index.js'

const SOCKET_REGISTRY_PACKAGE_NAME = '@socketsecurity/registry'

describe(SOCKET_REGISTRY_PACKAGE_NAME, () => {
  it('should export main registry functions', () => {
    expect(registry).toBeDefined()
    expect(typeof registry).toBe('object')
  })

  it('should have working utility functions', async () => {
    const { isObjectObject } = await import('../registry/dist/lib/objects.js')
    expect(typeof isObjectObject).toBe('function')
    expect(isObjectObject({})).toBe(true)
    expect(isObjectObject(null)).toBe(false)
    expect(isObjectObject([])).toBe(false)
  })
})
