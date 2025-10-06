/**
 * @fileoverview Tests for coverage output formatters.
 */

import { describe, expect, it } from 'vitest'

import {
  formatCoverage,
  getCoverageEmoji,
} from '../../registry/dist/lib/coverage/index.js'

import type { CodeCoverageResult } from '../../registry/dist/lib/coverage/index.js'

describe('coverage formatters module', () => {
  describe('getCoverageEmoji', () => {
    it('should return rocket emoji for 99%+', () => {
      expect(getCoverageEmoji(99)).toBe(' 🚀')
      expect(getCoverageEmoji(99.5)).toBe(' 🚀')
      expect(getCoverageEmoji(100)).toBe(' 🚀')
    })

    it('should return target emoji for 95-98%', () => {
      expect(getCoverageEmoji(95)).toBe(' 🎯')
      expect(getCoverageEmoji(96)).toBe(' 🎯')
      expect(getCoverageEmoji(98)).toBe(' 🎯')
    })

    it('should return sparkles emoji for 90-94%', () => {
      expect(getCoverageEmoji(90)).toBe(' ✨')
      expect(getCoverageEmoji(92)).toBe(' ✨')
      expect(getCoverageEmoji(94)).toBe(' ✨')
    })

    it('should return green heart emoji for 85-89%', () => {
      expect(getCoverageEmoji(85)).toBe(' 💚')
      expect(getCoverageEmoji(87)).toBe(' 💚')
      expect(getCoverageEmoji(89)).toBe(' 💚')
    })

    it('should return checkmark emoji for 80-84%', () => {
      expect(getCoverageEmoji(80)).toBe(' ✅')
      expect(getCoverageEmoji(82)).toBe(' ✅')
      expect(getCoverageEmoji(84)).toBe(' ✅')
    })

    it('should return green circle emoji for 70-79%', () => {
      expect(getCoverageEmoji(70)).toBe(' 🟢')
      expect(getCoverageEmoji(75)).toBe(' 🟢')
      expect(getCoverageEmoji(79)).toBe(' 🟢')
    })

    it('should return yellow circle emoji for 60-69%', () => {
      expect(getCoverageEmoji(60)).toBe(' 🟡')
      expect(getCoverageEmoji(65)).toBe(' 🟡')
      expect(getCoverageEmoji(69)).toBe(' 🟡')
    })

    it('should return hammer emoji for 50-59%', () => {
      expect(getCoverageEmoji(50)).toBe(' 🔨')
      expect(getCoverageEmoji(55)).toBe(' 🔨')
      expect(getCoverageEmoji(59)).toBe(' 🔨')
    })

    it('should return warning emoji for 0-49%', () => {
      expect(getCoverageEmoji(0)).toBe(' ⚠️')
      expect(getCoverageEmoji(25)).toBe(' ⚠️')
      expect(getCoverageEmoji(49)).toBe(' ⚠️')
    })
  })

  describe('formatCoverage', () => {
    const mockCodeCoverage: CodeCoverageResult = {
      branches: { covered: 90, percent: '90.00', total: 100 },
      functions: { covered: 85, percent: '85.00', total: 100 },
      lines: { covered: 95, percent: '95.00', total: 100 },
      statements: { covered: 95, percent: '95.00', total: 100 },
    }

    describe('default format', () => {
      it('should format code coverage with emoji', () => {
        const result = formatCoverage({ code: mockCodeCoverage })

        expect(result).toContain('Code Coverage:')
        expect(result).toContain('Statements: 95.00%')
        expect(result).toContain('Branches: 90.00%')
        expect(result).toContain('Functions: 85.00%')
        expect(result).toContain('Lines: 95.00%')
        expect(result).toContain('Overall: 91.25%')
        expect(result).toContain('✨')
      })

      it('should format code and type coverage', () => {
        const result = formatCoverage({
          code: mockCodeCoverage,
          type: { covered: 800, percent: '80.00', total: 1000 },
        })

        expect(result).toContain('Code Coverage:')
        expect(result).toContain('Type Coverage:')
        expect(result).toContain('80.00% (800/1000)')
        expect(result).toContain('Overall: 89.00%')
      })

      it('should calculate overall correctly with type coverage', () => {
        const result = formatCoverage({
          code: mockCodeCoverage,
          type: { covered: 900, percent: '90.00', total: 1000 },
        })

        expect(result).toContain('Overall: 91.00%')
      })

      it('should use correct emoji for overall percentage', () => {
        const highCoverage: CodeCoverageResult = {
          branches: { covered: 99, percent: '99.00', total: 100 },
          functions: { covered: 99, percent: '99.00', total: 100 },
          lines: { covered: 99, percent: '99.00', total: 100 },
          statements: { covered: 99, percent: '99.00', total: 100 },
        }

        const result = formatCoverage({ code: highCoverage })
        expect(result).toContain('Overall: 99.00% 🚀')
      })
    })

    describe('simple format', () => {
      it('should return only overall percentage', () => {
        const result = formatCoverage({
          code: mockCodeCoverage,
          format: 'simple',
        })

        expect(result).toBe('91.25')
        expect(result).not.toContain('Code Coverage:')
        expect(result).not.toContain('emoji')
      })

      it('should calculate overall with type coverage', () => {
        const result = formatCoverage({
          code: mockCodeCoverage,
          format: 'simple',
          type: { covered: 800, percent: '80.00', total: 1000 },
        })

        expect(result).toBe('89.00')
      })
    })

    describe('json format', () => {
      it('should return JSON string with code coverage', () => {
        const result = formatCoverage({
          code: mockCodeCoverage,
          format: 'json',
        })

        const parsed = JSON.parse(result)
        expect(parsed.code).toEqual(mockCodeCoverage)
        expect(parsed.type).toBeUndefined()
      })

      it('should return JSON string with code and type coverage', () => {
        const typeCoverage = { covered: 800, percent: '80.00', total: 1000 }
        const result = formatCoverage({
          code: mockCodeCoverage,
          format: 'json',
          type: typeCoverage,
        })

        const parsed = JSON.parse(result)
        expect(parsed.code).toEqual(mockCodeCoverage)
        expect(parsed.type).toEqual(typeCoverage)
      })

      it('should format JSON with proper indentation', () => {
        const result = formatCoverage({
          code: mockCodeCoverage,
          format: 'json',
        })

        expect(result).toContain('\n')
        expect(result).toContain('  ')
      })
    })

    describe('edge cases', () => {
      it('should handle zero coverage', () => {
        const zeroCoverage: CodeCoverageResult = {
          branches: { covered: 0, percent: '0.00', total: 100 },
          functions: { covered: 0, percent: '0.00', total: 100 },
          lines: { covered: 0, percent: '0.00', total: 100 },
          statements: { covered: 0, percent: '0.00', total: 100 },
        }

        const result = formatCoverage({ code: zeroCoverage })
        expect(result).toContain('Overall: 0.00% ⚠️')
      })

      it('should handle perfect coverage', () => {
        const perfectCoverage: CodeCoverageResult = {
          branches: { covered: 100, percent: '100.00', total: 100 },
          functions: { covered: 100, percent: '100.00', total: 100 },
          lines: { covered: 100, percent: '100.00', total: 100 },
          statements: { covered: 100, percent: '100.00', total: 100 },
        }

        const result = formatCoverage({ code: perfectCoverage })
        expect(result).toContain('Overall: 100.00% 🚀')
      })

      it('should handle mixed coverage values', () => {
        const mixedCoverage: CodeCoverageResult = {
          branches: { covered: 50, percent: '50.00', total: 100 },
          functions: { covered: 75, percent: '75.00', total: 100 },
          lines: { covered: 60, percent: '60.00', total: 100 },
          statements: { covered: 80, percent: '80.00', total: 100 },
        }

        const result = formatCoverage({ code: mixedCoverage })
        expect(result).toContain('Overall: 66.25%')
      })
    })
  })
})
