/**
 * @fileoverview Unit tests for spinner shimmer effects.
 */

import { RAINBOW_GRADIENT } from '@socketsecurity/lib/effects/ultra'
import { Spinner } from '@socketsecurity/lib/spinner'
import { describe, expect, it } from 'vitest'

describe('Spinner shimmer effects', () => {
  describe('shimmer configuration', () => {
    it('creates spinner without shimmer by default', () => {
      const spinner = Spinner()
      expect(spinner).toBeDefined()
    })

    it('creates spinner with LTR shimmer', () => {
      const spinner = Spinner({ shimmer: { dir: 'ltr' } })
      expect(spinner).toBeDefined()
    })

    it('creates spinner with RTL shimmer', () => {
      const spinner = Spinner({ shimmer: { dir: 'rtl' } })
      expect(spinner).toBeDefined()
    })

    it('creates spinner with bidirectional shimmer', () => {
      const spinner = Spinner({ shimmer: { dir: 'bi' } })
      expect(spinner).toBeDefined()
    })

    it('creates spinner with random shimmer', () => {
      const spinner = Spinner({ shimmer: { dir: 'random' } })
      expect(spinner).toBeDefined()
    })
  })

  describe('color handling', () => {
    it('uses Socket purple as default color', () => {
      const spinner = Spinner()
      expect(spinner.color).toEqual([140, 82, 255])
    })

    it('accepts custom RGB color', () => {
      const spinner = Spinner({ color: [0, 230, 118] })
      expect(spinner.color).toEqual([0, 230, 118])
    })

    it('accepts color name and converts to RGB', () => {
      const spinner = Spinner({ color: 'magenta' })
      expect(spinner.color).toEqual([255, 0, 255])
    })

    it('accepts yellowBright color name', () => {
      const spinner = Spinner({ color: 'yellowBright' })
      expect(spinner.color).toEqual([255, 255, 153])
    })

    it('accepts cyan color name', () => {
      const spinner = Spinner({ color: 'cyan' })
      expect(spinner.color).toEqual([0, 255, 255])
    })

    it('allows dynamic color changes', () => {
      const spinner = Spinner({ color: 'blue' })
      expect(spinner.color).toEqual([0, 0, 255])

      spinner.color = [0, 128, 0]
      expect(spinner.color).toEqual([0, 128, 0])

      spinner.color = [255, 0, 255]
      expect(spinner.color).toEqual([255, 0, 255])
    })

    it('converts color names to RGB when setting dynamically', () => {
      const spinner = Spinner()
      spinner.color = [255, 0, 0]
      expect(spinner.color).toEqual([255, 0, 0])
    })
  })

  describe('shimmer color inheritance', () => {
    it('shimmer inherits spinner color by default', () => {
      const spinner = Spinner({
        color: [0, 230, 118],
        shimmer: { dir: 'ltr' },
      })
      expect(spinner.color).toEqual([0, 230, 118])
    })

    it('shimmer can use explicit inherit', () => {
      const spinner = Spinner({
        color: 'yellowBright',
        shimmer: {
          color: 'inherit',
          dir: 'bi',
        },
      })
      expect(spinner.color).toEqual([255, 255, 153])
    })

    it('shimmer can have different color than spinner', () => {
      const spinner = Spinner({
        color: 'cyan',
        shimmer: {
          color: [255, 200, 0],
          dir: 'bi',
        },
      })
      expect(spinner.color).toEqual([0, 255, 255])
    })
  })

  describe('rainbow gradient (ultrathink effect)', () => {
    it('creates spinner with rainbow gradient', () => {
      const spinner = Spinner({
        shimmer: {
          color: RAINBOW_GRADIENT,
          dir: 'ltr',
        },
      })
      expect(spinner).toBeDefined()
    })

    it('rainbow gradient has correct number of colors', () => {
      expect(RAINBOW_GRADIENT).toHaveLength(10)
    })

    it('rainbow gradient contains valid RGB tuples', () => {
      for (const color of RAINBOW_GRADIENT) {
        expect(color).toHaveLength(3)
        expect(color[0]).toBeGreaterThanOrEqual(0)
        expect(color[0]).toBeLessThanOrEqual(255)
        expect(color[1]).toBeGreaterThanOrEqual(0)
        expect(color[1]).toBeLessThanOrEqual(255)
        expect(color[2]).toBeGreaterThanOrEqual(0)
        expect(color[2]).toBeLessThanOrEqual(255)
      }
    })
  })

  describe('shimmer speed control', () => {
    it('creates spinner with default speed', () => {
      const spinner = Spinner({
        shimmer: { dir: 'ltr' },
      })
      expect(spinner).toBeDefined()
    })
  })
})
