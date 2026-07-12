/**
 * @file Tests for is-core-module NPM package override. Ported 1:1 from upstream
 *   v2.16.2 (is-core-module@2.16.2):
 *   https://github.com/inspect-js/is-core-module/blob/v2.16.2/test/index.js.
 */

import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

type IsCore = (moduleName: string, nodeVersion?: string) => boolean

const {
  eco,
  module: isCore,
  pkgPath,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

function loadPortableIsCore(): IsCore {
  if (skip) {
    return () => false
  }
  return require(path.join(pkgPath, 'index.js'))
}

const portableIsCore = loadPortableIsCore()

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

  describe('nodeVersion parameter (node export)', () => {
    it('throws because the node export delegates to node:module isBuiltin', () => {
      expect(() => isCore('fs', '20.0.0')).toThrow(TypeError)
    })
  })

  describe('portable export (index.js, explicit nodeVersion)', () => {
    it('_stream_readable is core on Node versions before the v26 removal', () => {
      expect(portableIsCore('_stream_readable', '20.0.0')).toBe(true)
      expect(portableIsCore('_stream_readable', '25.9.9')).toBe(true)
    })

    it('_stream_readable is no longer core on Node 26 and later', () => {
      expect(portableIsCore('_stream_readable', '26.0.0')).toBe(false)
      expect(portableIsCore('_stream_readable', '27.0.0')).toBe(false)
    })

    it('node:_stream_writable is no longer core on Node 26 and later', () => {
      expect(portableIsCore('node:_stream_writable', '16.0.0')).toBe(true)
      expect(portableIsCore('node:_stream_writable', '26.0.0')).toBe(false)
    })

    it('unversioned core modules are unaffected by the v26 cutoff', () => {
      expect(portableIsCore('fs', '26.0.0')).toBe(true)
      expect(portableIsCore('stream', '26.0.0')).toBe(true)
    })
  })
})
