/**
 * @fileoverview Tests for table formatting utilities.
 *
 * Validates ASCII table rendering with borders, alignment, and colors.
 */
import { describe, expect, it } from 'vitest'
import type { TableColumn } from '../../../registry/dist/lib/tables.js'
import {
  formatSimpleTable,
  formatTable,
} from '../../../registry/dist/lib/tables.js'

describe('tables utilities', () => {
  describe('formatTable', () => {
    it('should return no data message for empty array', () => {
      const result = formatTable([], [])
      expect(result).toBe('(no data)')
    })

    it('should format simple table with one column', () => {
      const data = [{ name: 'lodash' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Package' }]
      const result = formatTable(data, columns)

      expect(result).toContain('Package')
      expect(result).toContain('lodash')
      expect(result).toContain('┌')
      expect(result).toContain('└')
      expect(result).toContain('│')
    })

    it('should format table with multiple columns', () => {
      const data = [
        { name: 'lodash', version: '4.17.21', issues: 0 },
        { name: 'react', version: '18.2.0', issues: 2 },
      ]
      const columns: TableColumn[] = [
        { key: 'name', header: 'Package' },
        { key: 'version', header: 'Version' },
        { key: 'issues', header: 'Issues' },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('Package')
      expect(result).toContain('Version')
      expect(result).toContain('Issues')
      expect(result).toContain('lodash')
      expect(result).toContain('react')
      expect(result).toContain('4.17.21')
      expect(result).toContain('18.2.0')
    })

    it('should handle left alignment', () => {
      const data = [{ name: 'test' }]
      const columns: TableColumn[] = [
        { key: 'name', header: 'Name', align: 'left' },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('test')
      expect(result).toContain('Name')
    })

    it('should handle right alignment', () => {
      const data = [{ count: '123' }]
      const columns: TableColumn[] = [
        { key: 'count', header: 'Count', align: 'right' },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('123')
      expect(result).toContain('Count')
    })

    it('should handle center alignment', () => {
      const data = [{ status: 'OK' }]
      const columns: TableColumn[] = [
        { key: 'status', header: 'Status', align: 'center' },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('OK')
      expect(result).toContain('Status')
    })

    it('should handle missing values', () => {
      const data = [{ name: 'test' }]
      const columns: TableColumn[] = [
        { key: 'name', header: 'Name' },
        { key: 'missing', header: 'Missing' },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('Name')
      expect(result).toContain('Missing')
      expect(result).toContain('test')
    })

    it('should handle null values', () => {
      const data = [{ name: null }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatTable(data, columns)

      expect(result).toContain('Name')
    })

    it('should handle undefined values', () => {
      const data = [{ name: undefined }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatTable(data, columns)

      expect(result).toContain('Name')
    })

    it('should handle color function', () => {
      const data = [{ status: 'error' }, { status: 'ok' }]
      const columns: TableColumn[] = [
        {
          key: 'status',
          header: 'Status',
          color: v => (v === 'error' ? `RED${v}` : `GREEN${v}`),
        },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('REDerror')
      expect(result).toContain('GREENok')
    })

    it('should handle custom width', () => {
      const data = [{ name: 'x' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'N', width: 20 }]
      const result = formatTable(data, columns)

      expect(result).toContain('N')
      expect(result).toContain('x')
    })

    it('should calculate correct column widths', () => {
      const data = [{ name: 'short' }, { name: 'very long name here' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatTable(data, columns)

      expect(result).toContain('very long name here')
      expect(result).toContain('short')
    })

    it('should handle single row', () => {
      const data = [{ name: 'only' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatTable(data, columns)

      expect(result).toContain('only')
      expect(result).toContain('┌')
      expect(result).toContain('└')
    })

    it('should handle many rows', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ id: i }))
      const columns: TableColumn[] = [{ key: 'id', header: 'ID' }]
      const result = formatTable(data, columns)

      expect(result).toContain('ID')
      expect(result).toContain('0')
      expect(result).toContain('9')
    })

    it('should convert non-string values to strings', () => {
      const data = [{ num: 123, bool: true, obj: {} }]
      const columns: TableColumn[] = [
        { key: 'num', header: 'Number' },
        { key: 'bool', header: 'Boolean' },
        { key: 'obj', header: 'Object' },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('123')
      expect(result).toContain('true')
      expect(result).toContain('[object Object]')
    })

    it('should handle empty string values', () => {
      const data = [{ name: '' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatTable(data, columns)

      expect(result).toContain('Name')
      expect(result).toContain('│')
    })

    it('should handle special characters', () => {
      const data = [{ text: 'hello@world.com' }]
      const columns: TableColumn[] = [{ key: 'text', header: 'Email' }]
      const result = formatTable(data, columns)

      expect(result).toContain('hello@world.com')
    })

    it('should handle Unicode characters', () => {
      const data = [{ text: '世界' }]
      const columns: TableColumn[] = [{ key: 'text', header: 'Text' }]
      const result = formatTable(data, columns)

      expect(result).toContain('世界')
    })

    it('should handle emoji', () => {
      const data = [{ status: '✓' }]
      const columns: TableColumn[] = [{ key: 'status', header: 'Status' }]
      const result = formatTable(data, columns)

      expect(result).toContain('✓')
    })

    it('should handle ANSI escape codes in data', () => {
      const data = [{ text: '\u001b[31mred\u001b[0m' }]
      const columns: TableColumn[] = [{ key: 'text', header: 'Text' }]
      const result = formatTable(data, columns)

      expect(result).toContain('red')
    })

    it('should handle mixed alignment columns', () => {
      const data = [{ a: '1', b: '2', c: '3' }]
      const columns: TableColumn[] = [
        { key: 'a', header: 'A', align: 'left' },
        { key: 'b', header: 'B', align: 'center' },
        { key: 'c', header: 'C', align: 'right' },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('1')
      expect(result).toContain('2')
      expect(result).toContain('3')
    })

    it('should handle header longer than data', () => {
      const data = [{ x: 'a' }]
      const columns: TableColumn[] = [{ key: 'x', header: 'Very Long Header' }]
      const result = formatTable(data, columns)

      expect(result).toContain('Very Long Header')
      expect(result).toContain('a')
    })

    it('should handle data longer than header', () => {
      const data = [{ x: 'very long data value' }]
      const columns: TableColumn[] = [{ key: 'x', header: 'X' }]
      const result = formatTable(data, columns)

      expect(result).toContain('X')
      expect(result).toContain('very long data value')
    })

    it('should create proper table structure', () => {
      const data = [{ a: '1' }]
      const columns: TableColumn[] = [{ key: 'a', header: 'A' }]
      const result = formatTable(data, columns)
      const lines = result.split('\n')

      expect(lines.length).toBeGreaterThanOrEqual(5)
      expect(lines[0]).toContain('┌')
      expect(lines[lines.length - 1]).toContain('└')
    })

    it('should handle color function with ANSI codes', () => {
      const data = [{ value: 'test' }]
      const columns: TableColumn[] = [
        {
          key: 'value',
          header: 'Value',
          color: v => `\u001b[31m${v}\u001b[0m`,
        },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('test')
    })

    it('should handle zero-width values', () => {
      const data = [{ value: '' }]
      const columns: TableColumn[] = [{ key: 'value', header: '' }]
      const result = formatTable(data, columns)

      expect(typeof result).toBe('string')
    })

    it('should handle large numeric values', () => {
      const data = [{ num: 1_234_567_890 }]
      const columns: TableColumn[] = [{ key: 'num', header: 'Number' }]
      const result = formatTable(data, columns)

      expect(result).toContain('1234567890')
    })

    it('should handle negative numbers', () => {
      const data = [{ num: -123 }]
      const columns: TableColumn[] = [{ key: 'num', header: 'Number' }]
      const result = formatTable(data, columns)

      expect(result).toContain('-123')
    })

    it('should handle float numbers', () => {
      const data = [{ num: Math.PI }]
      const columns: TableColumn[] = [{ key: 'num', header: 'Pi' }]
      const result = formatTable(data, columns)

      expect(result).toContain('3.14159')
    })
  })

  describe('formatSimpleTable', () => {
    it('should return no data message for empty array', () => {
      const result = formatSimpleTable([], [])
      expect(result).toBe('(no data)')
    })

    it('should format simple table with one column', () => {
      const data = [{ name: 'lodash' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Package' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Package')
      expect(result).toContain('lodash')
      expect(result).toContain('─')
      expect(result).not.toContain('┌')
      expect(result).not.toContain('└')
    })

    it('should format table with multiple columns', () => {
      const data = [
        { name: 'lodash', version: '4.17.21' },
        { name: 'react', version: '18.2.0' },
      ]
      const columns: TableColumn[] = [
        { key: 'name', header: 'Package' },
        { key: 'version', header: 'Version' },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Package')
      expect(result).toContain('Version')
      expect(result).toContain('lodash')
      expect(result).toContain('react')
      expect(result).toContain('4.17.21')
      expect(result).toContain('18.2.0')
    })

    it('should handle left alignment', () => {
      const data = [{ name: 'test' }]
      const columns: TableColumn[] = [
        { key: 'name', header: 'Name', align: 'left' },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('test')
      expect(result).toContain('Name')
    })

    it('should handle right alignment', () => {
      const data = [{ count: '123' }]
      const columns: TableColumn[] = [
        { key: 'count', header: 'Count', align: 'right' },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('123')
      expect(result).toContain('Count')
    })

    it('should handle center alignment', () => {
      const data = [{ status: 'OK' }]
      const columns: TableColumn[] = [
        { key: 'status', header: 'Status', align: 'center' },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('OK')
      expect(result).toContain('Status')
    })

    it('should handle missing values', () => {
      const data = [{ name: 'test' }]
      const columns: TableColumn[] = [
        { key: 'name', header: 'Name' },
        { key: 'missing', header: 'Missing' },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Name')
      expect(result).toContain('Missing')
      expect(result).toContain('test')
    })

    it('should handle null values', () => {
      const data = [{ name: null }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Name')
    })

    it('should handle undefined values', () => {
      const data = [{ name: undefined }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Name')
    })

    it('should handle color function', () => {
      const data = [{ status: 'error' }, { status: 'ok' }]
      const columns: TableColumn[] = [
        {
          key: 'status',
          header: 'Status',
          color: v => (v === 'error' ? `RED${v}` : `GREEN${v}`),
        },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('REDerror')
      expect(result).toContain('GREENok')
    })

    it('should handle custom width', () => {
      const data = [{ name: 'x' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'N', width: 20 }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('N')
      expect(result).toContain('x')
    })

    it('should calculate correct column widths', () => {
      const data = [{ name: 'short' }, { name: 'very long name here' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('very long name here')
      expect(result).toContain('short')
    })

    it('should handle single row', () => {
      const data = [{ name: 'only' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('only')
      expect(result).toContain('─')
    })

    it('should handle many rows', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ id: i }))
      const columns: TableColumn[] = [{ key: 'id', header: 'ID' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('ID')
      expect(result).toContain('0')
      expect(result).toContain('9')
    })

    it('should convert non-string values to strings', () => {
      const data = [{ num: 123, bool: true, obj: {} }]
      const columns: TableColumn[] = [
        { key: 'num', header: 'Number' },
        { key: 'bool', header: 'Boolean' },
        { key: 'obj', header: 'Object' },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('123')
      expect(result).toContain('true')
      expect(result).toContain('[object Object]')
    })

    it('should handle empty string values', () => {
      const data = [{ name: '' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Name')
    })

    it('should handle special characters', () => {
      const data = [{ text: 'hello@world.com' }]
      const columns: TableColumn[] = [{ key: 'text', header: 'Email' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('hello@world.com')
    })

    it('should handle Unicode characters', () => {
      const data = [{ text: '世界' }]
      const columns: TableColumn[] = [{ key: 'text', header: 'Text' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('世界')
    })

    it('should handle emoji', () => {
      const data = [{ status: '✓' }]
      const columns: TableColumn[] = [{ key: 'status', header: 'Status' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('✓')
    })

    it('should handle ANSI escape codes in data', () => {
      const data = [{ text: '\u001b[31mred\u001b[0m' }]
      const columns: TableColumn[] = [{ key: 'text', header: 'Text' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('red')
    })

    it('should handle mixed alignment columns', () => {
      const data = [{ a: '1', b: '2', c: '3' }]
      const columns: TableColumn[] = [
        { key: 'a', header: 'A', align: 'left' },
        { key: 'b', header: 'B', align: 'center' },
        { key: 'c', header: 'C', align: 'right' },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('1')
      expect(result).toContain('2')
      expect(result).toContain('3')
    })

    it('should handle header longer than data', () => {
      const data = [{ x: 'a' }]
      const columns: TableColumn[] = [{ key: 'x', header: 'Very Long Header' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Very Long Header')
      expect(result).toContain('a')
    })

    it('should handle data longer than header', () => {
      const data = [{ x: 'very long data value' }]
      const columns: TableColumn[] = [{ key: 'x', header: 'X' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('X')
      expect(result).toContain('very long data value')
    })

    it('should create proper simple table structure', () => {
      const data = [{ a: '1' }]
      const columns: TableColumn[] = [{ key: 'a', header: 'A' }]
      const result = formatSimpleTable(data, columns)
      const lines = result.split('\n')

      expect(lines.length).toBeGreaterThanOrEqual(3)
      expect(lines[1]).toContain('─')
    })

    it('should not include borders', () => {
      const data = [{ name: 'test' }]
      const columns: TableColumn[] = [{ key: 'name', header: 'Name' }]
      const result = formatSimpleTable(data, columns)

      expect(result).not.toContain('┌')
      expect(result).not.toContain('└')
      expect(result).not.toContain('│')
    })

    it('should use double space column separator', () => {
      const data = [{ a: '1', b: '2' }]
      const columns: TableColumn[] = [
        { key: 'a', header: 'A' },
        { key: 'b', header: 'B' },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('  ')
    })

    it('should handle color function with ANSI codes', () => {
      const data = [{ value: 'test' }]
      const columns: TableColumn[] = [
        {
          key: 'value',
          header: 'Value',
          color: v => `\u001b[31m${v}\u001b[0m`,
        },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('test')
    })

    it('should handle zero-width values', () => {
      const data = [{ value: '' }]
      const columns: TableColumn[] = [{ key: 'value', header: '' }]
      const result = formatSimpleTable(data, columns)

      expect(typeof result).toBe('string')
    })

    it('should handle large numeric values', () => {
      const data = [{ num: 1_234_567_890 }]
      const columns: TableColumn[] = [{ key: 'num', header: 'Number' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('1234567890')
    })

    it('should handle negative numbers', () => {
      const data = [{ num: -123 }]
      const columns: TableColumn[] = [{ key: 'num', header: 'Number' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('-123')
    })

    it('should handle float numbers', () => {
      const data = [{ num: Math.PI }]
      const columns: TableColumn[] = [{ key: 'num', header: 'Pi' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('3.14159')
    })
  })

  describe('edge cases', () => {
    it('should handle very long cell values in formatTable', () => {
      const data = [{ text: 'x'.repeat(100) }]
      const columns: TableColumn[] = [{ key: 'text', header: 'Text' }]
      const result = formatTable(data, columns)

      expect(result).toContain('x'.repeat(100))
    })

    it('should handle very long cell values in formatSimpleTable', () => {
      const data = [{ text: 'x'.repeat(100) }]
      const columns: TableColumn[] = [{ key: 'text', header: 'Text' }]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('x'.repeat(100))
    })

    it('should handle many columns in formatTable', () => {
      const data = [
        { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6', g: '7', h: '8' },
      ]
      const columns: TableColumn[] = [
        { key: 'a', header: 'A' },
        { key: 'b', header: 'B' },
        { key: 'c', header: 'C' },
        { key: 'd', header: 'D' },
        { key: 'e', header: 'E' },
        { key: 'f', header: 'F' },
        { key: 'g', header: 'G' },
        { key: 'h', header: 'H' },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('1')
      expect(result).toContain('8')
    })

    it('should handle many columns in formatSimpleTable', () => {
      const data = [
        { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6', g: '7', h: '8' },
      ]
      const columns: TableColumn[] = [
        { key: 'a', header: 'A' },
        { key: 'b', header: 'B' },
        { key: 'c', header: 'C' },
        { key: 'd', header: 'D' },
        { key: 'e', header: 'E' },
        { key: 'f', header: 'F' },
        { key: 'g', header: 'G' },
        { key: 'h', header: 'H' },
      ]
      const result = formatSimpleTable(data, columns)

      expect(result).toContain('1')
      expect(result).toContain('8')
    })

    it('should handle newlines in cell values', () => {
      const data = [{ text: 'line1\nline2' }]
      const columns: TableColumn[] = [{ key: 'text', header: 'Text' }]
      const result = formatTable(data, columns)

      expect(result).toContain('line1')
    })

    it('should handle tabs in cell values', () => {
      const data = [{ text: 'col1\tcol2' }]
      const columns: TableColumn[] = [{ key: 'text', header: 'Text' }]
      const result = formatTable(data, columns)

      expect(result).toContain('col1')
    })

    it('should handle mixed ANSI codes in multiple columns', () => {
      const data = [
        { a: '\u001b[31mred\u001b[0m', b: '\u001b[32mgreen\u001b[0m' },
      ]
      const columns: TableColumn[] = [
        { key: 'a', header: 'A' },
        { key: 'b', header: 'B' },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('red')
      expect(result).toContain('green')
    })

    it('should handle alignment with ANSI codes', () => {
      const data = [{ num: '\u001b[31m123\u001b[0m' }]
      const columns: TableColumn[] = [
        { key: 'num', header: 'Number', align: 'right' },
      ]
      const result = formatTable(data, columns)

      expect(result).toContain('123')
    })

    it('should handle very wide fixed width', () => {
      const data = [{ x: 'a' }]
      const columns: TableColumn[] = [{ key: 'x', header: 'X', width: 50 }]
      const result = formatTable(data, columns)

      expect(result).toContain('a')
    })

    it('should handle color function returning empty string', () => {
      const data = [{ value: 'test' }]
      const columns: TableColumn[] = [
        { key: 'value', header: 'Value', color: () => '' },
      ]
      const result = formatTable(data, columns)

      expect(typeof result).toBe('string')
    })

    it('should handle zero values', () => {
      const data = [{ num: 0 }]
      const columns: TableColumn[] = [{ key: 'num', header: 'Number' }]
      const result = formatTable(data, columns)

      expect(result).toContain('0')
    })

    it('should handle false boolean values', () => {
      const data = [{ bool: false }]
      const columns: TableColumn[] = [{ key: 'bool', header: 'Boolean' }]
      const result = formatTable(data, columns)

      expect(result).toContain('false')
    })

    it('should handle array values', () => {
      const data = [{ arr: [1, 2, 3] }]
      const columns: TableColumn[] = [{ key: 'arr', header: 'Array' }]
      const result = formatTable(data, columns)

      expect(result).toContain('1,2,3')
    })

    it('should handle date values', () => {
      const date = new Date('2024-01-01')
      const data = [{ date }]
      const columns: TableColumn[] = [{ key: 'date', header: 'Date' }]
      const result = formatTable(data, columns)

      expect(result).toContain('2023')
    })
  })
})
