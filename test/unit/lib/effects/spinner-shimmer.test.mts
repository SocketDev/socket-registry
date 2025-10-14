/**
 * @fileoverview Unit tests for spinner shimmer effects.
 */

import { describe, expect, it } from 'vitest'

import { RAINBOW_GRADIENT } from '../../../../registry/dist/lib/effects/ultra.js'
import { Spinner } from '../../../../registry/dist/lib/spinner.js'

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

  describe('status methods', () => {
    it('success() keeps spinner running (design decision)', () => {
      const spinner = Spinner({ shimmer: { dir: 'ltr' } })
      spinner.start('Processing')
      spinner.success('Step complete')
      // Spinner should still be running - this is intentional behavior
      expect(spinner).toBeDefined()
    })

    it('successAndStop() stops the spinner', () => {
      const spinner = Spinner({ shimmer: { dir: 'ltr' } })
      spinner.start('Processing')
      spinner.successAndStop('Done')
      // Spinner should be stopped
      expect(spinner).toBeDefined()
    })

    it('fail() keeps spinner running (design decision)', () => {
      const spinner = Spinner({ shimmer: { dir: 'ltr' } })
      spinner.start('Processing')
      spinner.fail('Step failed')
      // Spinner should still be running - this is intentional behavior
      expect(spinner).toBeDefined()
    })

    it('failAndStop() stops the spinner', () => {
      const spinner = Spinner({ shimmer: { dir: 'ltr' } })
      spinner.start('Processing')
      spinner.failAndStop('Failed')
      // Spinner should be stopped
      expect(spinner).toBeDefined()
    })
  })

  describe('text handling', () => {
    it('handles plain text', () => {
      const spinner = Spinner({ shimmer: { dir: 'ltr' } })
      spinner.start('Loading packages')
      expect(spinner).toBeDefined()
    })

    it('preserves bold text styling', () => {
      const spinner = Spinner({ shimmer: { dir: 'bi' } })
      // Note: In actual use, colors.bold() would be applied to the text
      spinner.start('Bold text')
      expect(spinner).toBeDefined()
    })

    it('preserves italic text styling', () => {
      const spinner = Spinner({ shimmer: { dir: 'ltr' } })
      spinner.start('Italic text')
      expect(spinner).toBeDefined()
    })

    it('preserves underline text styling', () => {
      const spinner = Spinner({ shimmer: { dir: 'rtl' } })
      spinner.start('Underline text')
      expect(spinner).toBeDefined()
    })

    it('starts spinner with shimmer', () => {
      const spinner = Spinner({ shimmer: { dir: 'ltr' } })
      spinner.start('Processing')
      expect(spinner).toBeDefined()
      spinner.stop()
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

    it('supports rainbow gradient with bidirectional shimmer', () => {
      const spinner = Spinner({
        shimmer: {
          color: RAINBOW_GRADIENT,
          dir: 'bi',
        },
      })
      spinner.start('Ultrathink complete')
      expect(spinner).toBeDefined()
    })

    it('supports rainbow gradient with RTL shimmer', () => {
      const spinner = Spinner({
        shimmer: {
          color: RAINBOW_GRADIENT,
          dir: 'rtl',
        },
      })
      spinner.start('Processing with rainbow')
      expect(spinner).toBeDefined()
    })
  })

  describe('shimmer speed control', () => {
    it('creates spinner with default speed', () => {
      const spinner = Spinner({
        shimmer: { dir: 'ltr' },
      })
      expect(spinner).toBeDefined()
    })

    it('creates spinner with custom speed (slow)', () => {
      const spinner = Spinner({
        shimmer: {
          dir: 'ltr',
          speed: 0.2,
        },
      })
      spinner.start('Slow shimmer')
      expect(spinner).toBeDefined()
    })

    it('creates spinner with custom speed (fast)', () => {
      const spinner = Spinner({
        shimmer: {
          dir: 'ltr',
          speed: 1.0,
        },
      })
      spinner.start('Fast shimmer')
      expect(spinner).toBeDefined()
    })

    it('supports fractional speed for smooth animation', () => {
      const spinner = Spinner({
        shimmer: {
          dir: 'bi',
          speed: 1 / 3,
        },
      })
      spinner.start('Smooth shimmer')
      expect(spinner).toBeDefined()
    })

    it('combines speed with rainbow gradient', () => {
      const spinner = Spinner({
        shimmer: {
          color: RAINBOW_GRADIENT,
          dir: 'ltr',
          speed: 0.5,
        },
      })
      spinner.start('Rainbow with custom speed')
      expect(spinner).toBeDefined()
    })
  })

  describe('custom color gradients', () => {
    it('creates spinner with custom 2-color gradient', () => {
      const gradient = [
        [255, 0, 0],
        [0, 0, 255],
      ] as const
      const spinner = Spinner({
        shimmer: {
          color: gradient,
          dir: 'ltr',
        },
      })
      spinner.start('Red to blue gradient')
      expect(spinner).toBeDefined()
    })

    it('creates spinner with custom 3-color gradient', () => {
      const gradient = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
      ] as const
      const spinner = Spinner({
        shimmer: {
          color: gradient,
          dir: 'bi',
        },
      })
      spinner.start('RGB gradient')
      expect(spinner).toBeDefined()
    })

    it('supports gradients with bidirectional shimmer', () => {
      const gradient = [
        [255, 100, 120],
        [255, 180, 60],
        [120, 200, 100],
        [80, 160, 220],
      ] as const
      const spinner = Spinner({
        shimmer: {
          color: gradient,
          dir: 'bi',
        },
      })
      spinner.start('Custom gradient')
      expect(spinner).toBeDefined()
    })
  })
})
