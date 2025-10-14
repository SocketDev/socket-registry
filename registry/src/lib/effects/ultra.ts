/**
 * @fileoverview Ultrathink rainbow gradient effect.
 * Provides rainbow gradient color generation for shimmer animations.
 * "Ultrathink" is Claude's intensive thinking mode for deep analysis.
 */

import type { ShimmerColorGradient, ShimmerColorRgb } from './types'

/**
 * Rainbow gradient colors used for ultrathink effect.
 * This gradient cycles through the full color spectrum with smooth transitions.
 */
export const RAINBOW_GRADIENT: ShimmerColorGradient = [
  [255, 100, 120], // red/pink
  [255, 140, 80], // orange
  [255, 180, 60], // yellow/gold
  [220, 200, 80], // yellow/green
  [120, 200, 100], // green
  [80, 200, 180], // cyan/turquoise
  [80, 160, 220], // blue
  [140, 120, 220], // purple/violet
  [200, 100, 200], // pink/magenta
  [255, 100, 140], // red/pink
]

/**
 * Generate rainbow gradient colors for any text length.
 * Colors are distributed evenly across the text by cycling through the gradient.
 */
export function generateRainbowGradient(
  textLength: number,
): ShimmerColorGradient {
  const colors: ShimmerColorRgb[] = []

  for (let i = 0; i < textLength; i += 1) {
    const colorIndex = i % RAINBOW_GRADIENT.length
    const color = RAINBOW_GRADIENT[colorIndex]
    if (color) {
      colors.push(color)
    }
  }

  return colors as ShimmerColorGradient
}
