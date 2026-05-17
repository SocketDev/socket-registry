/**
 * @fileoverview Tests for is-core-module NPM package override.
 * Ported 1:1 from upstream v2.16.1 (9d91e714):
 * https://github.com/inspect-js/is-core-module/blob/9d91e714e294b2ee41c1b6beae1ad06aacdaf5ca/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: isCore,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('isCore()', () => {
    it('fs is a core module', () => {
      expect(isCore('fs')).toBe(true)
    })

    it('net is a core module', () => {
      expect(isCore('net')).toBe(true)
    })

    it('http is a core module', () => {
      expect(isCore('http')).toBe(true)
    })

    it('seq is not a core module', () => {
      expect(isCore('seq')).toBe(false)
    })

    it('../ is not a core module', () => {
      expect(isCore('../')).toBe(false)
    })

    it('toString is not a core module', () => {
      expect(isCore('toString')).toBe(false)
    })
  })

  describe('core list', () => {
    it('known core modules can be required', () => {
      const knownCore = ['fs', 'path', 'http', 'https', 'url', 'os', 'util']
      for (let i = 0, { length } = knownCore; i < length; i += 1) {
        const mod = knownCore[i]
        expect(isCore(mod)).toBe(true)
      }
    })

    it('non-core modules are detected', () => {
      const nonCore = ['express', 'lodash', 'react', 'not-a-module']
      for (let i = 0, { length } = nonCore; i < length; i += 1) {
        const mod = nonCore[i]
        expect(isCore(mod)).toBe(false)
      }
    })
  })

  describe('node: prefix', () => {
    it('node:fs is a core module', () => {
      expect(isCore('node:fs')).toBe(true)
    })

    it('node:path is a core module', () => {
      expect(isCore('node:path')).toBe(true)
    })
  })
})
