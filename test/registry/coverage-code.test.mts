/**
 * @fileoverview Tests for code coverage utilities for parsing v8 coverage data.
 */

import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCodeCoverage } from '../../registry/dist/lib/coverage/index.js'
import { trash } from '../../scripts/utils/fs.mjs'

import type { V8CoverageData } from '../../registry/dist/lib/coverage/index.js'

describe('code coverage module', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coverage-test-'))
  })

  afterEach(async () => {
    await trash([tempDir])
    vi.restoreAllMocks()
  })

  describe('getCodeCoverage', () => {
    it('should parse v8 coverage data correctly', async () => {
      const coverageData: V8CoverageData = {
        '/path/to/file1.js': {
          b: {
            '0': [10, 5],
            '1': [8, 0],
          },
          f: {
            '0': 10,
            '1': 5,
          },
          path: '/path/to/file1.js',
          s: {
            '0': 10,
            '1': 5,
            '2': 0,
          },
        },
        '/path/to/file2.js': {
          b: {
            '0': [3, 2],
          },
          f: {
            '0': 3,
          },
          path: '/path/to/file2.js',
          s: {
            '0': 3,
            '1': 2,
          },
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.statements.total).toBe(5)
      expect(result.statements.covered).toBe(4)
      expect(result.statements.percent).toBe('80.00')

      expect(result.branches.total).toBe(6)
      expect(result.branches.covered).toBe(5)
      expect(result.branches.percent).toBe('83.33')

      expect(result.functions.total).toBe(3)
      expect(result.functions.covered).toBe(3)
      expect(result.functions.percent).toBe('100.00')

      expect(result.lines.total).toBe(5)
      expect(result.lines.covered).toBe(4)
      expect(result.lines.percent).toBe('80.00')
    })

    it('should handle empty coverage data', async () => {
      const coverageData: V8CoverageData = {}
      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.statements.total).toBe(0)
      expect(result.statements.covered).toBe(0)
      expect(result.statements.percent).toBe('0.00')

      expect(result.branches.total).toBe(0)
      expect(result.branches.covered).toBe(0)
      expect(result.branches.percent).toBe('0.00')

      expect(result.functions.total).toBe(0)
      expect(result.functions.covered).toBe(0)
      expect(result.functions.percent).toBe('0.00')

      expect(result.lines.total).toBe(0)
      expect(result.lines.covered).toBe(0)
      expect(result.lines.percent).toBe('0.00')
    })

    it('should calculate percentages correctly', async () => {
      const coverageData: V8CoverageData = {
        '/path/to/file.js': {
          b: {
            '0': [1, 1, 1],
          },
          f: {
            '0': 1,
            '1': 1,
          },
          path: '/path/to/file.js',
          s: {
            '0': 1,
            '1': 1,
          },
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.statements.percent).toBe('100.00')
      expect(result.branches.percent).toBe('100.00')
      expect(result.functions.percent).toBe('100.00')
      expect(result.lines.percent).toBe('100.00')
    })

    it('should handle files with missing coverage sections', async () => {
      const coverageData: V8CoverageData = {
        '/path/to/file.js': {
          path: '/path/to/file.js',
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.statements.total).toBe(0)
      expect(result.branches.total).toBe(0)
      expect(result.functions.total).toBe(0)
      expect(result.lines.total).toBe(0)
    })

    it('should ignore non-object file entries', async () => {
      const coverageData = {
        '/path/to/file.js': {
          path: '/path/to/file.js',
          s: { '0': 1 },
        },
        'invalid-entry': 'not an object',
        'another-invalid': 123,
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.statements.total).toBe(1)
      expect(result.statements.covered).toBe(1)
    })

    it('should ignore non-number counts in statements', async () => {
      const coverageData = {
        '/path/to/file.js': {
          path: '/path/to/file.js',
          s: {
            '0': 1,
            '1': 'invalid',
            '2': null,
            '3': 0,
          },
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.statements.total).toBe(2)
      expect(result.statements.covered).toBe(1)
    })

    it('should ignore non-array branch counts', async () => {
      const coverageData = {
        '/path/to/file.js': {
          b: {
            '0': [1, 0],
            '1': 'invalid',
            '2': { not: 'an array' },
          },
          path: '/path/to/file.js',
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.branches.total).toBe(2)
      expect(result.branches.covered).toBe(1)
    })

    it('should ignore non-number function counts', async () => {
      const coverageData = {
        '/path/to/file.js': {
          f: {
            '0': 5,
            '1': 'invalid',
            '2': null,
            '3': 0,
          },
          path: '/path/to/file.js',
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.functions.total).toBe(2)
      expect(result.functions.covered).toBe(1)
    })

    it('should handle coverage path with default value when file exists', async () => {
      const result = await getCodeCoverage()

      expect(result).toHaveProperty('branches')
      expect(result).toHaveProperty('functions')
      expect(result).toHaveProperty('lines')
      expect(result).toHaveProperty('statements')
    })

    it('should throw error when coverage file does not exist', async () => {
      const coveragePath = path.join(tempDir, 'nonexistent.json')

      await expect(
        getCodeCoverage({ coveragePath, generateIfMissing: false }),
      ).rejects.toThrow(
        `Coverage file not found at "${coveragePath}". Run tests with coverage first.`,
      )
    })

    it('should throw error when coverage path is empty string', async () => {
      await expect(getCodeCoverage({ coveragePath: '' })).rejects.toThrow(
        'Coverage path is required.',
      )
    })

    it('should throw error for invalid coverage data format', async () => {
      const coveragePath = path.join(tempDir, 'invalid.json')
      await fs.writeFile(coveragePath, '[]')

      await expect(getCodeCoverage({ coveragePath })).rejects.toThrow(
        `Invalid coverage data format in "${coveragePath}"`,
      )
    })

    it('should throw error for non-object coverage data', async () => {
      const coveragePath = path.join(tempDir, 'invalid.json')
      await fs.writeFile(coveragePath, '"string data"')

      await expect(getCodeCoverage({ coveragePath })).rejects.toThrow(
        `Invalid coverage data format in "${coveragePath}"`,
      )
    })

    it('should calculate zero percent for zero total', async () => {
      const coverageData: V8CoverageData = {}
      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.statements.percent).toBe('0.00')
      expect(result.branches.percent).toBe('0.00')
      expect(result.functions.percent).toBe('0.00')
      expect(result.lines.percent).toBe('0.00')
    })

    it('should handle complex v8 coverage with multiple files', async () => {
      const coverageData: V8CoverageData = {
        '/file1.js': {
          b: { '0': [10, 5], '1': [8, 0, 3] },
          f: { '0': 10, '1': 5, '2': 0 },
          path: '/file1.js',
          s: { '0': 10, '1': 5, '2': 0, '3': 8 },
        },
        '/file2.js': {
          b: { '0': [3, 2] },
          f: { '0': 3, '1': 2 },
          path: '/file2.js',
          s: { '0': 3, '1': 2 },
        },
        '/file3.js': {
          b: { '0': [1, 1, 1, 1] },
          f: { '0': 1 },
          path: '/file3.js',
          s: { '0': 1 },
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.statements.total).toBe(7)
      expect(result.statements.covered).toBe(6)
      expect(result.statements.percent).toBe('85.71')

      expect(result.branches.total).toBe(11)
      expect(result.branches.covered).toBe(10)
      expect(result.branches.percent).toBe('90.91')

      expect(result.functions.total).toBe(6)
      expect(result.functions.covered).toBe(5)
      expect(result.functions.percent).toBe('83.33')
    })

    it('should handle branches with non-number elements', async () => {
      const coverageData = {
        '/path/to/file.js': {
          b: {
            '0': [1, 0, 'invalid', 2],
          },
          path: '/path/to/file.js',
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.branches.total).toBe(3)
      expect(result.branches.covered).toBe(2)
    })

    it('should skip non-object statement maps', async () => {
      const coverageData = {
        '/path/to/file.js': {
          path: '/path/to/file.js',
          s: 'not an object',
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.statements.total).toBe(0)
    })

    it('should skip non-object branch maps', async () => {
      const coverageData = {
        '/path/to/file.js': {
          b: 'not an object',
          path: '/path/to/file.js',
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.branches.total).toBe(0)
    })

    it('should skip non-object function maps', async () => {
      const coverageData = {
        '/path/to/file.js': {
          f: 'not an object',
          path: '/path/to/file.js',
        },
      }

      const coveragePath = path.join(tempDir, 'coverage-final.json')
      await fs.writeFile(coveragePath, JSON.stringify(coverageData))

      const result = await getCodeCoverage({ coveragePath })

      expect(result.functions.total).toBe(0)
    })
  })
})
