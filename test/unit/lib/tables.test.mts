import { describe, expect, it } from 'vitest'

import {
  formatSimpleTable,
  formatTable,
} from '../../../registry/src/lib/tables'

describe('tables', () => {
  describe('formatSimpleTable', () => {
    it('renders simple table', () => {
      const result = formatSimpleTable(
        [
          { key: 'name', header: 'Name' },
          { key: 'value', header: 'Value' },
        ],
        [
          { name: 'foo', value: '123' },
          { name: 'bar', value: '456' },
        ],
      )
      expect(result).toContain('Name')
      expect(result).toContain('Value')
      expect(result).toContain('foo')
      expect(result).toContain('bar')
      expect(result).toContain('123')
      expect(result).toContain('456')
    })

    it('aligns columns', () => {
      const result = formatSimpleTable(
        [
          { key: 'left', header: 'Left', align: 'left' as const },
          { key: 'right', header: 'Right', align: 'right' as const },
          { key: 'center', header: 'Center', align: 'center' as const },
        ],
        [{ left: 'A', right: 'B', center: 'C' }],
      )
      expect(result).toContain('Left')
      expect(result).toContain('Right')
      expect(result).toContain('Center')
    })

    it('applies column colors', () => {
      const result = formatSimpleTable(
        [
          {
            key: 'name',
            header: 'Name',
            color: (v: string) => `<${v}>`,
          },
        ],
        [{ name: 'test' }],
      )
      expect(result).toContain('<test>')
    })

    it('handles fixed column widths', () => {
      const result = formatSimpleTable(
        [{ key: 'name', header: 'Name', width: 20 }],
        [{ name: 'short' }],
      )
      expect(result).toContain('Name')
      expect(result).toContain('short')
    })

    it('handles empty data', () => {
      const result = formatSimpleTable(
        [
          { key: 'name', header: 'Name' },
          { key: 'value', header: 'Value' },
        ],
        [],
      )
      expect(result).toContain('Name')
      expect(result).toContain('Value')
    })
  })

  describe('formatTable', () => {
    it('renders table with borders', () => {
      const result = formatTable(
        [
          { key: 'name', header: 'Name' },
          { key: 'age', header: 'Age' },
        ],
        [
          { name: 'Alice', age: '30' },
          { name: 'Bob', age: '25' },
        ],
      )
      expect(result).toContain('Name')
      expect(result).toContain('Age')
      expect(result).toContain('Alice')
      expect(result).toContain('Bob')
    })

    it('handles alignment in bordered table', () => {
      const result = formatTable(
        [
          { key: 'num', header: 'Number', align: 'right' as const },
          { key: 'text', header: 'Text', align: 'left' as const },
        ],
        [{ num: '42', text: 'hello' }],
      )
      expect(result).toContain('Number')
      expect(result).toContain('Text')
      expect(result).toContain('42')
      expect(result).toContain('hello')
    })
  })
})
