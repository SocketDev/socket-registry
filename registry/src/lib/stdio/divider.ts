/**
 * @fileoverview Console divider and separator utilities.
 * Provides various line styles for visual separation in CLI output.
 */

import { repeatString } from '../strings'

export interface DividerOptions {
  width?: number
  char?: string
  color?: (text: string) => string
}

/**
 * Create a divider line with custom character and width.
 */
export function divider(options?: DividerOptions): string {
  const opts = { __proto__: null, ...options } as DividerOptions
  const { char = '═', width = 55 } = opts
  return repeatString(char, width)
}

/**
 * Print a divider line to console.
 */
export function printDivider(options?: DividerOptions): void {
  console.log(divider(options))
}

/**
 * Common divider presets.
 */
export const dividers = {
  thick: () => divider({ char: '═' }),
  thin: () => divider({ char: '─' }),
  double: () => divider({ char: '═' }),
  single: () => divider({ char: '-' }),
  dotted: () => divider({ char: '·' }),
  dashed: () => divider({ char: '╌' }),
  wave: () => divider({ char: '~' }),
  star: () => divider({ char: '*' }),
  diamond: () => divider({ char: '◆' }),
  arrow: () => divider({ char: '→' }),
} as const

/**
 * Print a thick divider (default).
 */
export function printThickDivider(): void {
  printDivider({ char: '═' })
}

/**
 * Print a thin divider.
 */
export function printThinDivider(): void {
  printDivider({ char: '─' })
}

/**
 * Print a dotted line divider.
 */
export function printDottedDivider(): void {
  printDivider({ char: '·' })
}

/**
 * Create a section break with spacing.
 */
export function sectionBreak(options?: DividerOptions): string {
  const div = divider(options)
  return `\n${div}\n`
}

/**
 * Print a section break with spacing.
 */
export function printSectionBreak(options?: DividerOptions): void {
  console.log(sectionBreak(options))
}
