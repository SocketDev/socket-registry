/**
 * @fileoverview Tests for side-channel NPM package override.
 * Ported 1:1 from upstream v1.1.0 (26e368c3):
 * https://github.com/ljharb/side-channel/blob/26e368c3/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: getSideChannel,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function that returns a channel object', () => {
    expect(typeof getSideChannel).toBe('function')
    expect(getSideChannel.length).toBe(0)
    const channel = getSideChannel()
    expect(channel).toBeTruthy()
    expect(typeof channel).toBe('object')
  })

  describe('assert', () => {
    it('throws for nonexistent value', () => {
      const channel = getSideChannel()
      expect(() => channel.assert({})).toThrow(TypeError)
    })

    it('does not throw for existent value', () => {
      const channel = getSideChannel()
      const o = {}
      channel.set(o, 'data')
      expect(() => channel.assert(o)).not.toThrow()
    })
  })

  describe('has', () => {
    it('returns false for nonexistent value', () => {
      const channel = getSideChannel()
      const o: unknown[] = []
      expect(channel.has(o)).toBe(false)
    })

    it('returns true for existent value', () => {
      const channel = getSideChannel()
      const o: unknown[] = []
      channel.set(o, 'foo')
      expect(channel.has(o)).toBe(true)
    })

    it('works with non-object keys', () => {
      const channel = getSideChannel()
      expect(channel.has('abc')).toBe(false)
      channel.set('abc', 'foo')
      expect(channel.has('abc')).toBe(true)
    })
  })

  describe('get', () => {
    it('returns undefined for nonexistent value', () => {
      const channel = getSideChannel()
      const o = {}
      expect(channel.get(o)).toBe(undefined)
    })

    it('returns data set by set', () => {
      const channel = getSideChannel()
      const o = {}
      const data = {}
      channel.set(o, data)
      expect(channel.get(o)).toBe(data)
    })
  })

  describe('set', () => {
    it('sets and updates values', () => {
      const channel = getSideChannel()
      const o = function () {}
      expect(channel.get(o)).toBe(undefined)

      channel.set(o, 42)
      expect(channel.get(o)).toBe(42)

      channel.set(o, Infinity)
      expect(channel.get(o)).toBe(Infinity)

      const o2 = {}
      channel.set(o2, 17)
      expect(channel.get(o)).toBe(Infinity)
      expect(channel.get(o2)).toBe(17)

      channel.set(o, 14)
      expect(channel.get(o)).toBe(14)
      expect(channel.get(o2)).toBe(17)
    })
  })

  describe('delete', () => {
    it('returns false for nonexistent value', () => {
      const channel = getSideChannel()
      expect(channel.delete({})).toBe(false)
    })

    it('deletes existent value', () => {
      const channel = getSideChannel()
      const o = {}
      channel.set(o, 42)
      expect(channel.has(o)).toBe(true)
      expect(channel.delete({})).toBe(false)
      expect(channel.delete(o)).toBe(true)
      expect(channel.has(o)).toBe(false)
    })
  })
})
