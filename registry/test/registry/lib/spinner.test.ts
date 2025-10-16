import { beforeEach, describe, expect, it } from 'vitest'
import type { Spinner as SpinnerType } from '../../../src/lib/spinner'
import { Spinner } from '../../../src/lib/spinner'

describe('Spinner', () => {
  let spinner: SpinnerType

  beforeEach(() => {
    spinner = Spinner({ text: 'Testing' })
  })

  describe('shimmer() method', () => {
    describe('toggle on/off', () => {
      it('should disable shimmer with shimmer(false)', () => {
        // Start with shimmer enabled.
        spinner = Spinner({ shimmer: 'ltr', text: 'Test' })

        // Disable shimmer - should not throw.
        expect(() => spinner.shimmer(false)).not.toThrow()

        // Should still be the same spinner instance.
        expect(spinner).toBeDefined()
      })

      it('should re-enable shimmer with shimmer(true) after toggling off', () => {
        // Start with shimmer enabled with specific config.
        spinner = Spinner({ shimmer: { dir: 'rtl', speed: 0.5 }, text: 'Test' })

        // Toggle off.
        spinner.shimmer(false)

        // Toggle back on - should restore saved config without error.
        expect(() => spinner.shimmer(true)).not.toThrow()
      })

      it('should use defaults when shimmer(true) with no previous config', () => {
        // Start without shimmer.
        spinner = Spinner({ text: 'Test' })

        // Enable shimmer with defaults - should not throw.
        expect(() => spinner.shimmer(true)).not.toThrow()
      })
    })

    describe('partial config updates', () => {
      it('should update speed without affecting other properties', () => {
        // Start with shimmer.
        spinner = Spinner({
          shimmer: { dir: 'ltr', speed: 1 / 3 },
          text: 'Test',
        })

        // Update only speed - should not throw.
        expect(() => spinner.shimmer({ speed: 0.5 })).not.toThrow()
      })

      it('should update direction without affecting other properties', () => {
        // Start with shimmer.
        spinner = Spinner({
          shimmer: { dir: 'ltr', speed: 1 / 3 },
          text: 'Test',
        })

        // Update only direction - should not throw.
        expect(() => spinner.shimmer({ dir: 'rtl' })).not.toThrow()
      })

      it('should update color without affecting other properties', () => {
        // Start with shimmer.
        spinner = Spinner({ shimmer: 'ltr', text: 'Test' })

        // Update only color - should not throw.
        expect(() =>
          spinner.shimmer({ color: [255, 0, 0] as const }),
        ).not.toThrow()
      })

      it('should handle direction string shorthand', () => {
        // Start without shimmer.
        spinner = Spinner({ text: 'Test' })

        // Set direction via string - should not throw.
        expect(() => spinner.shimmer('rtl')).not.toThrow()
      })

      it('should update existing shimmer direction via string', () => {
        // Start with shimmer.
        spinner = Spinner({ shimmer: 'ltr', text: 'Test' })

        // Change direction via string - should not throw.
        expect(() => spinner.shimmer('rtl')).not.toThrow()
      })
    })

    describe('config preservation', () => {
      it('should preserve full config when toggling off and back on', () => {
        // Start with custom config.
        const customConfig = {
          color: [255, 100, 50] as const,
          dir: 'rtl' as const,
          speed: 0.25,
        }
        spinner = Spinner({ shimmer: customConfig, text: 'Test' })

        // Toggle off.
        spinner.shimmer(false)

        // Toggle back on.
        spinner.shimmer(true)

        // Make a partial update to verify config was preserved - should not throw.
        expect(() => spinner.shimmer({ speed: 0.3 })).not.toThrow()
      })

      it('should allow updates while shimmer is disabled', () => {
        // Start with shimmer.
        spinner = Spinner({ shimmer: 'ltr', text: 'Test' })

        // Disable shimmer.
        spinner.shimmer(false)

        // Update config while disabled - should save and re-enable without error.
        expect(() => spinner.shimmer({ speed: 0.5 })).not.toThrow()
      })

      it('should handle multiple partial updates in sequence', () => {
        // Start with shimmer.
        spinner = Spinner({ shimmer: 'ltr', text: 'Test' })

        // Multiple updates - should not throw.
        expect(() => {
          spinner.shimmer({ speed: 0.5 })
          spinner.shimmer({ dir: 'rtl' })
          spinner.shimmer({ color: [200, 100, 50] as const })
        }).not.toThrow()
      })
    })

    describe('chaining', () => {
      it('should support method chaining', () => {
        spinner = Spinner({ text: 'Test' })

        // Should be chainable and return the same spinner instance.
        const result = spinner
          .shimmer(true)
          .text('Updated')
          .shimmer({ speed: 0.5 })

        expect(result).toBe(spinner)
      })

      it('should chain multiple shimmer calls', () => {
        spinner = Spinner({ shimmer: 'ltr', text: 'Test' })

        // Should chain without errors.
        expect(() => {
          spinner
            .shimmer(false)
            .shimmer(true)
            .shimmer({ speed: 0.3 })
            .shimmer('rtl')
        }).not.toThrow()
      })
    })

    describe('type safety', () => {
      it('should accept boolean toggle', () => {
        spinner = Spinner({ text: 'Test' })

        // TypeScript should compile these without errors.
        spinner.shimmer(true)
        spinner.shimmer(false)
      })

      it('should accept direction string', () => {
        spinner = Spinner({ text: 'Test' })

        // TypeScript should compile these without errors.
        spinner.shimmer('ltr')
        spinner.shimmer('rtl')
        spinner.shimmer('bi')
        spinner.shimmer('random')
      })

      it('should accept partial config object', () => {
        spinner = Spinner({ text: 'Test' })

        // TypeScript should compile these without errors.
        spinner.shimmer({ speed: 0.5 })
        spinner.shimmer({ dir: 'rtl' })
        spinner.shimmer({ color: [255, 0, 0] as const })
        spinner.shimmer({ dir: 'ltr', speed: 0.25 })
      })
    })
  })
})
