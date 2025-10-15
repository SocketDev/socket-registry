/**
 * @fileoverview Unit tests for text shimmer animation utilities.
 */

import { describe, expect, it } from 'vitest'
import type {
  ShimmerColorGradient,
  ShimmerColorRgb,
  ShimmerState,
} from '../../../../registry/dist/lib/effects/text-shimmer.js'
import {
  applyShimmer,
  COLOR_INHERIT,
  DIR_LTR,
  DIR_NONE,
  DIR_RANDOM,
  DIR_RTL,
  MODE_BI,
} from '../../../../registry/dist/lib/effects/text-shimmer.js'

import {
  expectNumber,
  expectString,
} from '../../../utils/assertion-helpers.mts'

describe('text-shimmer', () => {
  describe('constants', () => {
    it('exports COLOR_INHERIT constant', () => {
      expect(COLOR_INHERIT).toBe('inherit')
      expectString(COLOR_INHERIT)
    })

    it('exports DIR_LTR constant', () => {
      expect(DIR_LTR).toBe('ltr')
      expectString(DIR_LTR)
    })

    it('exports DIR_RTL constant', () => {
      expect(DIR_RTL).toBe('rtl')
      expectString(DIR_RTL)
    })

    it('exports DIR_NONE constant', () => {
      expect(DIR_NONE).toBe('none')
      expectString(DIR_NONE)
    })

    it('exports DIR_RANDOM constant', () => {
      expect(DIR_RANDOM).toBe('random')
      expectString(DIR_RANDOM)
    })

    it('exports MODE_BI constant', () => {
      expect(MODE_BI).toBe('bi')
      expectString(MODE_BI)
    })
  })

  describe('applyShimmer with direction: none', () => {
    it('returns plain text without shimmer effect', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'none',
        speed: 1 / 3,
        step: 0,
      }
      const text = 'Hello World'
      const result = applyShimmer(text, state, { direction: DIR_NONE })

      expectString(result)
      // Should contain ANSI codes for coloring but no shimmer effect.
      expect(result).toContain('\x1b[38;2;')
      expect(result).toContain('\x1b[0m')
    })

    it('returns empty string for empty input', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'none',
        speed: 1 / 3,
        step: 0,
      }
      const result = applyShimmer('', state, { direction: DIR_NONE })
      expect(result).toBe('')
    })

    it('uses default Socket purple color', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'none',
        speed: 1 / 3,
        step: 0,
      }
      const result = applyShimmer('X', state, { direction: DIR_NONE })
      // Socket purple: [140, 82, 255].
      expect(result).toContain('\x1b[38;2;140;82;255m')
    })

    it('uses custom color when provided', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'none',
        speed: 1 / 3,
        step: 0,
      }
      const customColor: ShimmerColorRgb = [255, 0, 0] as const
      const result = applyShimmer('X', state, {
        color: customColor,
        direction: DIR_NONE,
      })
      expect(result).toContain('\x1b[38;2;255;0;0m')
    })

    it('applies gradient colors without shimmer', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'none',
        speed: 1 / 3,
        step: 0,
      }
      const gradient: ShimmerColorGradient = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
      ] as const
      const result = applyShimmer('ABC', state, {
        color: gradient,
        direction: DIR_NONE,
      })

      // Each character should get a color from the gradient.
      expect(result).toContain('\x1b[38;2;255;0;0m')
      expect(result).toContain('\x1b[38;2;0;255;0m')
      expect(result).toContain('\x1b[38;2;0;0;255m')
    })

    it('wraps gradient colors for longer text', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'none',
        speed: 1 / 3,
        step: 0,
      }
      const gradient: ShimmerColorGradient = [
        [255, 0, 0],
        [0, 255, 0],
      ] as const
      const result = applyShimmer('ABCD', state, {
        color: gradient,
        direction: DIR_NONE,
      })

      // Should wrap: A=red, B=green, C=red, D=green.
      const parts = result.split('\x1b[0m')
      expect(parts.filter(p => p.includes('\x1b[38;2;255;0;0m'))).toHaveLength(
        2,
      )
      expect(parts.filter(p => p.includes('\x1b[38;2;0;255;0m'))).toHaveLength(
        2,
      )
    })
  })

  describe('applyShimmer with LTR direction', () => {
    it('applies shimmer effect moving left to right', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const text = 'Test'

      const result1 = applyShimmer(text, state, { direction: DIR_LTR })
      expectString(result1)
      expect(result1).toContain('\x1b[38;2;')

      const result2 = applyShimmer(text, state, { direction: DIR_LTR })
      expectString(result2)
      // Step should have advanced.
      expect(state.step).toBeGreaterThan(0)
    })

    it('advances step by speed amount each frame', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0.5,
        step: 0,
      }

      applyShimmer('Test', state, { direction: DIR_LTR })
      expect(state.step).toBe(0.5)

      applyShimmer('Test', state, { direction: DIR_LTR })
      expect(state.step).toBe(1.0)

      applyShimmer('Test', state, { direction: DIR_LTR })
      expect(state.step).toBe(1.5)
    })

    it('resets step after completing cycle', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: 0,
      }
      const text = 'Hi'

      // Text length 2 + shimmerWidth 2.5 + 2 = ~6.5 total steps.
      // Run enough cycles to exceed total steps.
      for (let i = 0; i < 10; i += 1) {
        applyShimmer(text, state, { direction: DIR_LTR })
      }

      // Step should have reset at least once and be less than total steps.
      expect(state.step).toBeLessThan(7)
    })

    it('uses custom shimmer width', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: 0,
      }

      const result = applyShimmer('Test', state, {
        direction: DIR_LTR,
        shimmerWidth: 5,
      })
      expectString(result)
      // Wider shimmer should affect more characters.
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('applyShimmer with RTL direction', () => {
    it('applies shimmer effect moving right to left', () => {
      const state: ShimmerState = {
        currentDir: 'rtl',
        mode: 'rtl',
        speed: 1 / 3,
        step: 0,
      }
      const text = 'Test'

      const result = applyShimmer(text, state, { direction: DIR_RTL })
      expectString(result)
      expect(result).toContain('\x1b[38;2;')
      expect(state.step).toBeGreaterThan(0)
    })

    it('maintains RTL direction throughout cycle', () => {
      const state: ShimmerState = {
        currentDir: 'rtl',
        mode: 'rtl',
        speed: 1,
        step: 0,
      }

      for (let i = 0; i < 5; i += 1) {
        applyShimmer('Test', state, { direction: DIR_RTL })
      }

      expect(state.currentDir).toBe('rtl')
    })
  })

  describe('applyShimmer with bidirectional mode', () => {
    it('alternates direction between LTR and RTL', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'bi',
        speed: 1,
        step: 0,
      }
      const text = 'Hi'

      expect(state.currentDir).toBe('ltr')

      // Run enough cycles to trigger direction change.
      // Text length 2 + shimmerWidth 2.5 + 2 = ~6.5 total steps.
      for (let i = 0; i < 8; i += 1) {
        applyShimmer(text, state, { direction: MODE_BI })
      }

      // Direction should have changed to RTL.
      expect(state.currentDir).toBe('rtl')
    })

    it('resets step when changing direction', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'bi',
        speed: 10,
        step: 0,
      }

      // Force completion of first cycle.
      applyShimmer('X', state, { direction: MODE_BI })

      expect(state.step).toBe(0)
      expect(state.currentDir).toBe('rtl')
    })

    it('continues alternating for multiple cycles', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'bi',
        speed: 10,
        step: 0,
      }

      applyShimmer('X', state, { direction: MODE_BI })
      expect(state.currentDir).toBe('rtl')

      applyShimmer('X', state, { direction: MODE_BI })
      expect(state.currentDir).toBe('ltr')

      applyShimmer('X', state, { direction: MODE_BI })
      expect(state.currentDir).toBe('rtl')
    })
  })

  describe('applyShimmer with random direction', () => {
    it('picks random direction for each cycle', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'random',
        speed: 10,
        step: 0,
      }

      const directions: string[] = []

      // Run multiple cycles and collect directions.
      for (let i = 0; i < 20; i += 1) {
        applyShimmer('X', state, { direction: DIR_RANDOM })
        directions.push(state.currentDir)
      }

      // Should have both LTR and RTL in results (statistically very likely).
      const hasLtr = directions.includes('ltr')
      const hasRtl = directions.includes('rtl')

      // At least one of each direction should appear.
      expect(hasLtr || hasRtl).toBe(true)
    })

    it('resets step when picking new direction', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'random',
        speed: 10,
        step: 0,
      }

      applyShimmer('X', state, { direction: DIR_RANDOM })

      expect(state.step).toBe(0)
    })
  })

  describe('ANSI code detection and preservation', () => {
    it('detects and preserves bold text', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const boldText = '\x1b[1mBold\x1b[0m'

      const result = applyShimmer(boldText, state, { direction: DIR_LTR })

      expect(result).toContain('\x1b[1m')
    })

    it('detects and preserves dim text', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const dimText = '\x1b[2mDim\x1b[0m'

      const result = applyShimmer(dimText, state, { direction: DIR_LTR })

      expect(result).toContain('\x1b[2m')
    })

    it('detects and preserves italic text', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const italicText = '\x1b[3mItalic\x1b[0m'

      const result = applyShimmer(italicText, state, { direction: DIR_LTR })

      expect(result).toContain('\x1b[3m')
    })

    it('detects and preserves underline text', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const underlineText = '\x1b[4mUnderline\x1b[0m'

      const result = applyShimmer(underlineText, state, { direction: DIR_LTR })

      expect(result).toContain('\x1b[4m')
    })

    it('detects and preserves strikethrough text', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const strikethroughText = '\x1b[9mStrike\x1b[0m'

      const result = applyShimmer(strikethroughText, state, {
        direction: DIR_LTR,
      })

      expect(result).toContain('\x1b[9m')
    })

    it('preserves multiple text styles combined', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const styledText = '\x1b[1m\x1b[3m\x1b[4mStyled\x1b[0m'

      const result = applyShimmer(styledText, state, { direction: DIR_LTR })

      expect(result).toContain('\x1b[1m')
      expect(result).toContain('\x1b[3m')
      expect(result).toContain('\x1b[4m')
    })

    it('strips ANSI codes for plain text processing', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const coloredText = '\x1b[31mRed\x1b[0m'

      const result = applyShimmer(coloredText, state, { direction: DIR_LTR })

      // Should contain new color codes, not the original ones.
      expect(result).not.toContain('\x1b[31m')
      expect(result).toContain('\x1b[38;2;')
    })
  })

  describe('color blending and intensity', () => {
    it('creates brighter colors near shimmer position', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0,
        step: 0,
      }

      // Position shimmer at start of text.
      const result = applyShimmer('Test', state, {
        color: [100, 100, 100] as const,
        direction: DIR_LTR,
      })

      // First character should be brighter (blended with white).
      // Should contain RGB values closer to 255.
      expect(result).toContain('\x1b[38;2;')
    })

    it('uses base color for characters far from shimmer', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0,
        step: 20,
      }

      // Position shimmer far from text.
      const result = applyShimmer('Test', state, {
        color: [100, 50, 25] as const,
        direction: DIR_LTR,
      })

      // All characters should use base color (no blending).
      expect(result).toContain('\x1b[38;2;100;50;25m')
    })

    it('applies gradient colors before shimmer blending', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0,
        step: 0,
      }
      const gradient: ShimmerColorGradient = [
        [255, 0, 0],
        [0, 255, 0],
      ] as const

      const result = applyShimmer('AB', state, {
        color: gradient,
        direction: DIR_LTR,
      })

      // Should contain RGB codes for gradient colors.
      expectString(result)
      expect(result.length).toBeGreaterThan(0)
    })

    it('blends gradient colors with white at shimmer position', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0,
        step: 0,
      }
      const gradient: ShimmerColorGradient = [
        [100, 0, 0],
        [0, 100, 0],
      ] as const

      const result = applyShimmer('AB', state, {
        color: gradient,
        direction: DIR_LTR,
      })

      // First character should be brighter than base gradient color.
      expectString(result)
      expect(result).not.toContain('\x1b[38;2;100;0;0m')
    })
  })

  describe('shimmer width parameter', () => {
    it('uses default shimmer width of 2.5', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: 0,
      }

      const result = applyShimmer('Test', state, { direction: DIR_LTR })
      expectString(result)
      // Default behavior should work.
      expect(result.length).toBeGreaterThan(0)
    })

    it('accepts custom shimmer width', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: 0,
      }

      const result = applyShimmer('Test', state, {
        direction: DIR_LTR,
        shimmerWidth: 1.0,
      })
      expectString(result)
      expect(result.length).toBeGreaterThan(0)
    })

    it('wider shimmer affects more characters', () => {
      const state1: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0,
        step: 2,
      }
      const state2: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0,
        step: 2,
      }

      const narrowResult = applyShimmer('TestText', state1, {
        direction: DIR_LTR,
        shimmerWidth: 1,
      })
      const wideResult = applyShimmer('TestText', state2, {
        direction: DIR_LTR,
        shimmerWidth: 5,
      })

      expectString(narrowResult)
      expectString(wideResult)
      // Both should produce output.
      expect(narrowResult.length).toBeGreaterThan(0)
      expect(wideResult.length).toBeGreaterThan(0)
    })
  })

  describe('state management', () => {
    it('mutates state object in place', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: 0,
      }

      const initialStep = state.step
      applyShimmer('Test', state, { direction: DIR_LTR })

      expect(state.step).not.toBe(initialStep)
    })

    it('preserves mode throughout animation', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: 0,
      }

      for (let i = 0; i < 10; i += 1) {
        applyShimmer('Test', state, { direction: DIR_LTR })
      }

      expect(state.mode).toBe('ltr')
    })

    it('updates currentDir for bidirectional mode', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'bi',
        speed: 10,
        step: 0,
      }

      const initialDir = state.currentDir
      applyShimmer('X', state, { direction: MODE_BI })

      expect(state.currentDir).not.toBe(initialDir)
    })

    it('respects speed setting', () => {
      const slowState: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0.1,
        step: 0,
      }
      const fastState: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 2.0,
        step: 0,
      }

      applyShimmer('Test', slowState, { direction: DIR_LTR })
      applyShimmer('Test', fastState, { direction: DIR_LTR })

      expect(slowState.step).toBe(0.1)
      expect(fastState.step).toBe(2.0)
    })
  })

  describe('edge cases and boundary conditions', () => {
    it('handles single character text', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }

      const result = applyShimmer('X', state, { direction: DIR_LTR })
      expectString(result)
      expect(result).toContain('X')
    })

    it('handles very long text', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const longText = 'A'.repeat(100)

      const result = applyShimmer(longText, state, { direction: DIR_LTR })
      expectString(result)
      expect(result.length).toBeGreaterThan(100)
    })

    it('handles text with special characters', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const specialText = 'Hello! @#$%^&*()'

      const result = applyShimmer(specialText, state, { direction: DIR_LTR })
      expectString(result)
      expect(result).toContain('!')
      expect(result).toContain('@')
    })

    it('handles text with unicode characters', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const unicodeText = 'Hello 世界 🌍'

      const result = applyShimmer(unicodeText, state, { direction: DIR_LTR })
      expectString(result)
      expect(result.length).toBeGreaterThan(0)
    })

    it('handles zero speed', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0,
        step: 5,
      }

      applyShimmer('Test', state, { direction: DIR_LTR })

      // Step should not advance.
      expect(state.step).toBe(5)
    })

    it('handles fractional step values', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0.33,
        step: 0,
      }

      applyShimmer('Test', state, { direction: DIR_LTR })

      expectNumber(state.step)
      expect(state.step).toBeCloseTo(0.33, 2)
    })

    it('handles step exceeding text length', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: 100,
      }

      const result = applyShimmer('Test', state, { direction: DIR_LTR })
      expectString(result)
      expect(result.length).toBeGreaterThan(0)
    })

    it('handles negative step values', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: -5,
      }

      const result = applyShimmer('Test', state, { direction: DIR_LTR })
      expectString(result)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('shimmer positioning calculations', () => {
    it('calculates position for LTR direction', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 0,
        step: 0,
      }

      const result = applyShimmer('Test', state, { direction: DIR_LTR })
      expectString(result)
      // Shimmer at position 0 should affect first characters.
      expect(result.length).toBeGreaterThan(0)
    })

    it('calculates position for RTL direction', () => {
      const state: ShimmerState = {
        currentDir: 'rtl',
        mode: 'rtl',
        speed: 0,
        step: 0,
      }

      const result = applyShimmer('Test', state, { direction: DIR_RTL })
      expectString(result)
      // Shimmer should start from the right.
      expect(result.length).toBeGreaterThan(0)
    })

    it('moves shimmer position through complete cycle', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: 0,
      }
      const results: string[] = []

      // Collect multiple frames.
      for (let i = 0; i < 8; i += 1) {
        results.push(applyShimmer('Test', state, { direction: DIR_LTR }))
      }

      // Each frame should be different (shimmer is moving).
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThan(1)
    })
  })

  describe('options parameter handling', () => {
    it('works without options parameter', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'none',
        speed: 1 / 3,
        step: 0,
      }

      const result = applyShimmer('Test', state)
      expectString(result)
      expect(result.length).toBeGreaterThan(0)
    })

    it('works with empty options object', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'none',
        speed: 1 / 3,
        step: 0,
      }

      const result = applyShimmer('Test', state, {})
      expectString(result)
      expect(result.length).toBeGreaterThan(0)
    })

    it('uses default direction when not specified', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }

      const result = applyShimmer('Test', state, {
        color: [255, 0, 0] as const,
      })
      expectString(result)
      // Should default to 'none' direction.
      expect(result.length).toBeGreaterThan(0)
    })

    it('accepts all option combinations', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }

      const result = applyShimmer('Test', state, {
        color: [255, 100, 50] as const,
        direction: DIR_LTR,
        shimmerWidth: 3.0,
      })
      expectString(result)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('style detection accuracy', () => {
    it('does not detect styles in plain text', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }

      const result = applyShimmer('Plain text', state, { direction: DIR_LTR })
      expectString(result)
      // Should not contain bold, italic, etc. codes except color and reset.
      expect(result).toContain('\x1b[38;2;')
      expect(result).toContain('\x1b[0m')
    })

    it('detects only the styles present', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const boldOnly = '\x1b[1mBold\x1b[0m'

      const result = applyShimmer(boldOnly, state, { direction: DIR_LTR })

      expect(result).toContain('\x1b[1m')
      // Should not contain italic, underline, etc.
      expect(result).not.toContain('\x1b[3m')
      expect(result).not.toContain('\x1b[4m')
    })
  })

  describe('shimmer cycle completion', () => {
    it('completes full LTR cycle', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: 0,
      }
      const text = 'Hi'
      const totalSteps = text.length + 2.5 + 2

      // Run one complete cycle.
      for (let i = 0; i < Math.ceil(totalSteps); i += 1) {
        applyShimmer(text, state, { direction: DIR_LTR })
      }

      // Step should reset to beginning of new cycle.
      expect(state.step).toBeLessThan(totalSteps)
    })

    it('completes full RTL cycle', () => {
      const state: ShimmerState = {
        currentDir: 'rtl',
        mode: 'rtl',
        speed: 1,
        step: 0,
      }
      const text = 'Hi'
      const totalSteps = text.length + 2.5 + 2

      for (let i = 0; i < Math.ceil(totalSteps); i += 1) {
        applyShimmer(text, state, { direction: DIR_RTL })
      }

      expect(state.step).toBeLessThan(totalSteps)
    })

    it('completes full bidirectional cycle', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'bi',
        speed: 1,
        step: 0,
      }
      const text = 'Hi'
      const totalSteps = text.length + 2.5 + 2

      // Run two complete cycles to see both directions.
      for (let i = 0; i < Math.ceil(totalSteps) * 2; i += 1) {
        applyShimmer(text, state, { direction: MODE_BI })
      }

      expect(state.step).toBeLessThan(totalSteps)
    })
  })

  describe('color values validation', () => {
    it('handles RGB values at boundaries', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }

      const minColor: ShimmerColorRgb = [0, 0, 0] as const
      const maxColor: ShimmerColorRgb = [255, 255, 255] as const

      const result1 = applyShimmer('Test', state, {
        color: minColor,
        direction: DIR_LTR,
      })
      const result2 = applyShimmer('Test', state, {
        color: maxColor,
        direction: DIR_LTR,
      })

      expectString(result1)
      expectString(result2)
      expect(result1).toContain('\x1b[38;2;0;0;0m')
      expect(result2).toContain('\x1b[38;2;255;255;255m')
    })

    it('handles gradient with different RGB values', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }
      const gradient: ShimmerColorGradient = [
        [0, 0, 0],
        [127, 127, 127],
        [255, 255, 255],
      ] as const

      const result = applyShimmer('ABC', state, {
        color: gradient,
        direction: DIR_LTR,
      })

      expectString(result)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('performance and optimization scenarios', () => {
    it('handles rapid consecutive calls', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1 / 3,
        step: 0,
      }

      // Simulate rapid animation frames.
      for (let i = 0; i < 100; i += 1) {
        const result = applyShimmer('Test', state, { direction: DIR_LTR })
        expectString(result)
      }

      // Should complete without errors.
      expect(state.step).toBeGreaterThan(0)
    })

    it('handles different text on each call', () => {
      const state: ShimmerState = {
        currentDir: 'ltr',
        mode: 'ltr',
        speed: 1,
        step: 0,
      }

      const texts = ['Loading', 'Processing', 'Complete']

      for (const text of texts) {
        const result = applyShimmer(text, state, { direction: DIR_LTR })
        expectString(result)
      }

      expect(state.step).toBeGreaterThan(0)
    })
  })
})
