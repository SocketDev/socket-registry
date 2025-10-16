/**
 * @fileoverview Tests for interactive prompt utilities.
 *
 * Validates prompt re-exports and separator creation functionality.
 */
import { describe, expect, it } from 'vitest'
import type { Choice, Separator } from '../../../registry/dist/lib/prompts.js'
import {
  confirm,
  createSeparator,
  input,
  password,
  search,
  select,
} from '../../../registry/dist/lib/prompts.js'

describe('prompts utilities', () => {
  describe('re-exported functions', () => {
    it('should export confirm function', () => {
      expect(typeof confirm).toBe('function')
    })

    it('should export input function', () => {
      expect(typeof input).toBe('function')
    })

    it('should export password function', () => {
      expect(typeof password).toBe('function')
    })

    it('should export search function', () => {
      expect(typeof search).toBe('function')
    })

    it('should export select function', () => {
      expect(typeof select).toBe('function')
    })
  })

  describe('createSeparator', () => {
    it('should create separator with default text', () => {
      const result = createSeparator()
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('───────')
      expect(result.line).toBe('───────')
    })

    it('should create separator with custom text', () => {
      const result = createSeparator('Custom Text')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('Custom Text')
      expect(result.line).toBe('Custom Text')
    })

    it('should create separator with empty string', () => {
      const result = createSeparator('')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('───────')
      expect(result.line).toBe('───────')
    })

    it('should create separator with single character', () => {
      const result = createSeparator('-')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('-')
      expect(result.line).toBe('-')
    })

    it('should create separator with special characters', () => {
      const result = createSeparator('*** *** ***')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('*** *** ***')
      expect(result.line).toBe('*** *** ***')
    })

    it('should create separator with Unicode characters', () => {
      const result = createSeparator('━━━━━━━')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('━━━━━━━')
      expect(result.line).toBe('━━━━━━━')
    })

    it('should create separator with whitespace', () => {
      const result = createSeparator('   ')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('   ')
      expect(result.line).toBe('   ')
    })

    it('should create separator with very long text', () => {
      const longText = 'a'.repeat(100)
      const result = createSeparator(longText)
      expect(result.type).toBe('separator')
      expect(result.separator).toBe(longText)
      expect(result.line).toBe(longText)
    })

    it('should create separator with mixed content', () => {
      const result = createSeparator('--- Section 1 ---')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('--- Section 1 ---')
      expect(result.line).toBe('--- Section 1 ---')
    })

    it('should create separator with newline', () => {
      const result = createSeparator('line1\nline2')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('line1\nline2')
      expect(result.line).toBe('line1\nline2')
    })

    it('should create separator with emoji', () => {
      const result = createSeparator('🎯 Section 🎯')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('🎯 Section 🎯')
      expect(result.line).toBe('🎯 Section 🎯')
    })

    it('should always have type separator', () => {
      const tests = [undefined, '', 'text', '   ', '━━━', 'a'.repeat(1000)]
      for (const text of tests) {
        const result = createSeparator(text)
        expect(result.type).toBe('separator')
      }
    })

    it('should have separator and line properties match', () => {
      const tests = ['custom', undefined, '', '---', '🎯']
      for (const text of tests) {
        const result = createSeparator(text)
        expect(result.separator).toBe(result.line)
      }
    })
  })

  describe('type exports', () => {
    it('should have Choice type available', () => {
      const choice: Choice<string> = {
        value: 'test',
        name: 'Test Option',
        description: 'Test description',
        short: 'Test',
        disabled: false,
      }
      expect(choice.value).toBe('test')
    })

    it('should allow Choice with minimal properties', () => {
      const choice: Choice<number> = {
        value: 42,
      }
      expect(choice.value).toBe(42)
    })

    it('should allow Choice with disabled as string', () => {
      const choice: Choice<string> = {
        value: 'test',
        disabled: 'Not available',
      }
      expect(choice.disabled).toBe('Not available')
    })

    it('should allow Choice with disabled as boolean', () => {
      const choice: Choice<string> = {
        value: 'test',
        disabled: true,
      }
      expect(choice.disabled).toBe(true)
    })

    it('should have Separator type available', () => {
      const separator: Separator = {
        type: 'separator',
        separator: 'text',
        line: 'text',
      }
      expect(separator.type).toBe('separator')
    })

    it('should allow Separator with minimal properties', () => {
      const separator: Separator = {
        type: 'separator',
      }
      expect(separator.type).toBe('separator')
    })

    it('should allow Separator from createSeparator', () => {
      const separator: Separator = createSeparator('test')
      expect(separator.type).toBe('separator')
      expect(separator.separator).toBe('test')
      expect(separator.line).toBe('test')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined text parameter', () => {
      const result = createSeparator(undefined)
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('───────')
      expect(result.line).toBe('───────')
    })

    it('should handle null as falsy value', () => {
      // @ts-expect-error Testing runtime behavior with null
      const result = createSeparator(null)
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('───────')
      expect(result.line).toBe('───────')
    })

    it('should handle numeric input', () => {
      // @ts-expect-error Testing runtime behavior with number
      const result = createSeparator(123)
      expect(result.type).toBe('separator')
      expect(result.separator).toBe(123)
      expect(result.line).toBe(123)
    })

    it('should handle object input', () => {
      const obj = { toString: () => 'custom' }
      // @ts-expect-error Testing runtime behavior with object
      const result = createSeparator(obj)
      expect(result.type).toBe('separator')
      expect(result.separator).toBe(obj)
      expect(result.line).toBe(obj)
    })

    it('should create separator with tab characters', () => {
      const result = createSeparator('\t\t\t')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('\t\t\t')
      expect(result.line).toBe('\t\t\t')
    })

    it('should create separator with mixed whitespace', () => {
      const result = createSeparator(' \t \n ')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe(' \t \n ')
      expect(result.line).toBe(' \t \n ')
    })

    it('should create separator with zero-width characters', () => {
      const result = createSeparator('\u200B\u200C\u200D')
      expect(result.type).toBe('separator')
      expect(result.separator).toContain('\u200B')
    })

    it('should create multiple separators independently', () => {
      const sep1 = createSeparator('First')
      const sep2 = createSeparator('Second')
      expect(sep1.separator).toBe('First')
      expect(sep2.separator).toBe('Second')
      expect(sep1).not.toBe(sep2)
    })

    it('should create separator with HTML entities', () => {
      const result = createSeparator('&nbsp;&mdash;&nbsp;')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('&nbsp;&mdash;&nbsp;')
    })

    it('should create separator with escape sequences', () => {
      const result = createSeparator('\\n\\t\\r')
      expect(result.type).toBe('separator')
      expect(result.separator).toBe('\\n\\t\\r')
    })
  })
})
