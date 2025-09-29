import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { whichBin, whichBinSync } from '../../registry/dist/lib/bin.js'

describe('bin which utilities', () => {
  describe('whichBinSync', () => {
    it('should find binary in PATH synchronously', () => {
      const nodePath = whichBinSync('node')
      expect(nodePath).toBeTruthy()
      expect(typeof nodePath).toBe('string')
      expect(path.isAbsolute(nodePath as string)).toBe(true)
    })

    it('should return undefined for non-existent binaries', () => {
      const result = whichBinSync('nonexistentbinary12345')
      expect(result).toBeUndefined()
    })

    it('should handle options', () => {
      const result = whichBinSync('node', { all: false })
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should return array when all option is true', () => {
      const result = whichBinSync('node', { all: true })
      expect(Array.isArray(result)).toBe(true)
      if (result) {
        expect(result.length).toBeGreaterThan(0)
        ;(result as string[]).forEach((p: string) => {
          expect(typeof p).toBe('string')
          expect(path.isAbsolute(p)).toBe(true)
        })
      }
    })

    it('should handle combination of all and nothrow options', () => {
      // Test all: true, nothrow: true.
      const result1 = whichBinSync('nonexistentbinary12345', {
        all: true,
        nothrow: true,
      })
      expect(result1 === undefined || Array.isArray(result1)).toBe(true)

      // Test all: false, nothrow: true.
      const result2 = whichBinSync('nonexistentbinary12345', {
        all: false,
        nothrow: true,
      })
      expect(result2).toBeUndefined()

      // Test nothrow: false.
      expect(() => {
        whichBinSync('nonexistentbinary12345', { nothrow: false })
      }).toThrow()
    })

    it('should find binary synchronously', () => {
      const result = whichBinSync('node')
      expect(result).toBeTruthy()
      expect(result).toContain('node')
    })

    it('should return undefined when binary not found with nothrow', () => {
      const result = whichBinSync('nonexistent12345', { nothrow: true })
      expect(result).toBeUndefined()
    })

    it('should throw when binary not found without nothrow', () => {
      expect(() => {
        whichBinSync('nonexistent12345', { nothrow: false })
      }).toThrow()
    })

    it('should return all paths when all:true', () => {
      const result = whichBinSync('node', { all: true })
      expect(Array.isArray(result)).toBe(true)
      expect(result!.length).toBeGreaterThan(0)
    })

    it('should handle all:true with non-existent binary', () => {
      const result = whichBinSync('nonexistent12345', {
        all: true,
        nothrow: true,
      })
      expect(result).toBeUndefined()
    })
  })

  describe('whichBin', () => {
    it('should find binary in PATH asynchronously', async () => {
      const nodePath = await whichBin('node')
      expect(nodePath).toBeTruthy()
      expect(typeof nodePath).toBe('string')
      expect(path.isAbsolute(nodePath as string)).toBe(true)
    })

    it('should return undefined for non-existent binaries', async () => {
      const result = await whichBin('nonexistentbinary12345')
      expect(result).toBeUndefined()
    })

    it('should handle options', async () => {
      const result = await whichBin('node', { all: false })
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should return array when all option is true', async () => {
      const result = await whichBin('node', { all: true })
      expect(Array.isArray(result)).toBe(true)
      if (result) {
        expect(result.length).toBeGreaterThan(0)
        ;(result as string[]).forEach((p: string) => {
          expect(typeof p).toBe('string')
          expect(path.isAbsolute(p)).toBe(true)
        })
      }
    })

    it('should handle nothrow option', async () => {
      // With nothrow: true (default), should return undefined for non-existent.
      const result1 = await whichBin('nonexistentbinary12345', {
        nothrow: true,
      })
      expect(result1).toBeUndefined()

      // With nothrow: false, should throw.
      await expect(
        whichBin('nonexistentbinary12345', { nothrow: false }),
      ).rejects.toThrow()
    })

    it('should resolve paths for all results when all is true', async () => {
      const result = await whichBin('npm', { all: true })
      if (result && result.length > 0) {
        // All paths should be resolved (absolute).
        ;(result as string[]).forEach((p: string) => {
          expect(path.isAbsolute(p)).toBe(true)
        })
      }
    })

    it('should find binary asynchronously', async () => {
      const result = await whichBin('node')
      expect(result).toBeTruthy()
      expect(result).toContain('node')
    })

    it('should return undefined when binary not found with nothrow', async () => {
      const result = await whichBin('nonexistent12345', { nothrow: true })
      expect(result).toBeUndefined()
    })

    it('should throw when binary not found without nothrow', async () => {
      await expect(
        whichBin('nonexistent12345', { nothrow: false }),
      ).rejects.toThrow()
    })

    it('should return all paths when all:true', async () => {
      const result = await whichBin('node', { all: true })
      expect(Array.isArray(result)).toBe(true)
      expect(result!.length).toBeGreaterThan(0)
    })

    it('should handle all:true with non-existent binary', async () => {
      const result = await whichBin('nonexistent12345', {
        all: true,
        nothrow: true,
      })
      expect(result).toBeUndefined()
    })
  })
})
