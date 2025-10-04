import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(__dirname, '../fixtures/bin-test.mjs')

describe('bin module - subprocess tests', () => {
  describe('whichBin', () => {
    it('should find node binary', () => {
      const result = execSync(`node "${fixturePath}" whichBin-node`, {
        encoding: 'utf8',
      })
      expect(result).toContain('whichBin result:')
      expect(result).toContain('node')
    })

    it('should return undefined for nonexistent binary', () => {
      const result = execSync(`node "${fixturePath}" whichBin-not-found`, {
        encoding: 'utf8',
      })
      expect(result).toContain('undefined')
    })

    it('should return array when all option is true', () => {
      const result = execSync(`node "${fixturePath}" whichBin-all`, {
        encoding: 'utf8',
      })
      expect(result).toContain('whichBin all: true')
    })
  })

  describe('whichBinSync', () => {
    it('should find node binary synchronously', () => {
      const result = execSync(`node "${fixturePath}" whichBinSync-node`, {
        encoding: 'utf8',
      })
      expect(result).toContain('whichBinSync result:')
      expect(result).toContain('node')
    })

    it('should return undefined for nonexistent binary', () => {
      const result = execSync(`node "${fixturePath}" whichBinSync-not-found`, {
        encoding: 'utf8',
      })
      expect(result).toContain('undefined')
    })
  })

  describe('execBin', () => {
    it('should execute node with --version', () => {
      const result = execSync(`node "${fixturePath}" execBin-node`, {
        encoding: 'utf8',
      })
      expect(result).toContain('execBin completed')
    })

    it('should throw error for nonexistent binary', () => {
      const result = execSync(`node "${fixturePath}" execBin-not-found`, {
        encoding: 'utf8',
      })
      expect(result).toContain('ENOENT')
      expect(result).toContain('Binary not found')
    })
  })

  describe('resolveBinPathSync', () => {
    it('should resolve bin path synchronously', () => {
      const result = execSync(`node "${fixturePath}" resolveBinPathSync`, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '../..'),
      })
      expect(result).toContain('resolveBinPathSync:')
    })
  })

  describe('isShadowBinPath', () => {
    it('should detect shadow bin paths', () => {
      const result = execSync(`node "${fixturePath}" isShadowBinPath`, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '../..'),
      })
      expect(result).toContain('isShadowBinPath:')
    })
  })

  describe('findRealBin', () => {
    it('should find real bin path', () => {
      const result = execSync(`node "${fixturePath}" findRealBin`, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '../..'),
      })
      expect(result).toContain('findRealBin:')
    })
  })

  describe('findRealNpm', () => {
    it('should find real npm binary', () => {
      const result = execSync(`node "${fixturePath}" findRealNpm`, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '../..'),
      })
      expect(result).toContain('findRealNpm:')
    })
  })

  describe('findRealPnpm', () => {
    it('should find real pnpm binary', () => {
      const result = execSync(`node "${fixturePath}" findRealPnpm`, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '../..'),
      })
      expect(result).toContain('findRealPnpm:')
    })
  })

  describe('findRealYarn', () => {
    it('should find real yarn binary', () => {
      const result = execSync(`node "${fixturePath}" findRealYarn`, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '../..'),
      })
      expect(result).toContain('findRealYarn:')
    })
  })
})
