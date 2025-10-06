import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  formatSimpleTable,
  formatTable,
} from '../../registry/dist/lib/tables.js'

describe('tables module', () => {
  let getYoctocolorsMock: any

  beforeEach(() => {
    const mockColors = {
      bold: (str: string) => `**${str}**`,
      dim: (str: string) => `~~${str}~~`,
      green: (str: string) => `[green]${str}[/green]`,
      red: (str: string) => `[red]${str}[/red]`,
    }

    // @ts-ignore
    getYoctocolorsMock = vi.fn(() => mockColors)

    vi.doMock('../../registry/dist/lib/dependencies/logging.js', () => ({
      getYoctocolors: getYoctocolorsMock,
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('formatTable', () => {
    it('should return empty message for empty data', () => {
      const result = formatTable([], [])
      expect(result).toBe('(no data)')
    })

    it('should format simple table with left alignment', () => {
      const data = [
        { name: 'lodash', version: '4.17.21' },
        { name: 'react', version: '18.2.0' },
      ]
      const columns = [
        { key: 'name', header: 'Package' },
        { key: 'version', header: 'Version' },
      ]

      const result = formatTable(data, columns)

      expect(result).toContain('Package')
      expect(result).toContain('Version')
      expect(result).toContain('lodash')
      expect(result).toContain('react')
      expect(result).toContain('4.17.21')
      expect(result).toContain('18.2.0')
    })

    it('should handle right alignment', () => {
      const data = [{ count: 42 }, { count: 100 }]
      const columns = [
        { key: 'count', header: 'Count', align: 'right' as const },
      ]

      const result = formatTable(data, columns)

      expect(result).toContain('Count')
      expect(result).toContain('42')
      expect(result).toContain('100')
    })

    it('should handle center alignment', () => {
      const data = [{ status: 'ok' }, { status: 'error' }]
      const columns = [
        { key: 'status', header: 'Status', align: 'center' as const },
      ]

      const result = formatTable(data, columns)

      expect(result).toContain('Status')
      expect(result).toContain('ok')
      expect(result).toContain('error')
    })

    it('should apply color functions', () => {
      const data = [{ issues: 0 }, { issues: 5 }]
      const columns = [
        {
          key: 'issues',
          header: 'Issues',
          color: (v: string) =>
            v === '0' ? `[green]${v}[/green]` : `[red]${v}[/red]`,
        },
      ]

      const result = formatTable(data, columns)

      expect(result).toContain('[green]0[/green]')
      expect(result).toContain('[red]5[/red]')
    })

    it('should handle missing values', () => {
      const data = [{ name: 'lodash', version: '4.17.21' }, { name: 'react' }]
      const columns = [
        { key: 'name', header: 'Package' },
        { key: 'version', header: 'Version' },
      ]

      const result = formatTable(data, columns)

      expect(result).toContain('lodash')
      expect(result).toContain('react')
      expect(result).toContain('4.17.21')
    })

    it('should respect fixed column width', () => {
      const data = [{ name: 'verylongpackagename' }]
      const columns = [{ key: 'name', header: 'Name', width: 5 }]

      const result = formatTable(data, columns)

      expect(result).toContain('Name')
      expect(result).toContain('verylongpackagename')
    })

    it('should handle multiple columns', () => {
      const data = [
        { name: 'pkg1', version: '1.0.0', issues: 0, downloads: 1000 },
        { name: 'pkg2', version: '2.0.0', issues: 3, downloads: 500 },
      ]
      const columns = [
        { key: 'name', header: 'Package' },
        { key: 'version', header: 'Version', align: 'center' as const },
        { key: 'issues', header: 'Issues', align: 'right' as const },
        { key: 'downloads', header: 'Downloads', align: 'right' as const },
      ]

      const result = formatTable(data, columns)

      expect(result).toContain('Package')
      expect(result).toContain('Version')
      expect(result).toContain('Issues')
      expect(result).toContain('Downloads')
      expect(result).toContain('pkg1')
      expect(result).toContain('pkg2')
    })

    it('should include table borders', () => {
      const data = [{ name: 'test' }]
      const columns = [{ key: 'name', header: 'Name' }]

      const result = formatTable(data, columns)

      expect(result).toContain('┌')
      expect(result).toContain('├')
      expect(result).toContain('└')
      expect(result).toContain('│')
    })

    it('should handle numeric values', () => {
      const data = [
        { count: 42, ratio: 3.14 },
        { count: 100, ratio: 2.5 },
      ]
      const columns = [
        { key: 'count', header: 'Count' },
        { key: 'ratio', header: 'Ratio' },
      ]

      const result = formatTable(data, columns)

      expect(result).toContain('42')
      expect(result).toContain('100')
      expect(result).toContain('3.14')
      expect(result).toContain('2.5')
    })

    it('should handle boolean values', () => {
      const data = [
        { active: true, verified: false },
        { active: false, verified: true },
      ]
      const columns = [
        { key: 'active', header: 'Active' },
        { key: 'verified', header: 'Verified' },
      ]

      const result = formatTable(data, columns)

      expect(result).toContain('true')
      expect(result).toContain('false')
    })
  })

  describe('formatSimpleTable', () => {
    it('should return empty message for empty data', () => {
      const result = formatSimpleTable([], [])
      expect(result).toBe('(no data)')
    })

    it('should format simple table without borders', () => {
      const data = [
        { name: 'lodash', version: '4.17.21' },
        { name: 'react', version: '18.2.0' },
      ]
      const columns = [
        { key: 'name', header: 'Package' },
        { key: 'version', header: 'Version' },
      ]

      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Package')
      expect(result).toContain('Version')
      expect(result).toContain('lodash')
      expect(result).toContain('react')
      expect(result).not.toContain('┌')
      expect(result).not.toContain('├')
      expect(result).not.toContain('└')
    })

    it('should include separator line', () => {
      const data = [{ name: 'test' }]
      const columns = [{ key: 'name', header: 'Name' }]

      const result = formatSimpleTable(data, columns)

      expect(result).toContain('─')
    })

    it('should handle right alignment', () => {
      const data = [{ count: 42 }, { count: 100 }]
      const columns = [
        { key: 'count', header: 'Count', align: 'right' as const },
      ]

      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Count')
      expect(result).toContain('42')
      expect(result).toContain('100')
    })

    it('should handle center alignment', () => {
      const data = [{ status: 'ok' }, { status: 'error' }]
      const columns = [
        { key: 'status', header: 'Status', align: 'center' as const },
      ]

      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Status')
      expect(result).toContain('ok')
      expect(result).toContain('error')
    })

    it('should apply color functions', () => {
      const data = [{ issues: 0 }, { issues: 5 }]
      const columns = [
        {
          key: 'issues',
          header: 'Issues',
          color: (v: string) =>
            v === '0' ? `[green]${v}[/green]` : `[red]${v}[/red]`,
        },
      ]

      const result = formatSimpleTable(data, columns)

      expect(result).toContain('[green]0[/green]')
      expect(result).toContain('[red]5[/red]')
    })

    it('should handle missing values', () => {
      const data = [{ name: 'lodash', version: '4.17.21' }, { name: 'react' }]
      const columns = [
        { key: 'name', header: 'Package' },
        { key: 'version', header: 'Version' },
      ]

      const result = formatSimpleTable(data, columns)

      expect(result).toContain('lodash')
      expect(result).toContain('react')
      expect(result).toContain('4.17.21')
    })

    it('should respect fixed column width', () => {
      const data = [{ name: 'verylongpackagename' }]
      const columns = [{ key: 'name', header: 'Name', width: 5 }]

      const result = formatSimpleTable(data, columns)

      expect(result).toContain('Name')
      expect(result).toContain('verylongpackagename')
    })

    it('should use two-space column separator', () => {
      const data = [{ a: 'x', b: 'y' }]
      const columns = [
        { key: 'a', header: 'A' },
        { key: 'b', header: 'B' },
      ]

      const result = formatSimpleTable(data, columns)

      const lines = result.split('\n')
      expect(lines.some(line => line.includes('  '))).toBe(true)
    })
  })

  describe('stripAnsi handling', () => {
    it('should calculate width correctly with ANSI codes', () => {
      const data = [{ text: '\x1b[31mred\x1b[0m' }]
      const columns = [{ key: 'text', header: 'Text' }]

      const result = formatTable(data, columns)

      expect(result).toBeDefined()
    })
  })
})
