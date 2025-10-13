/**
 * Console header/banner formatting utilities.
 * Provides consistent header formatting for CLI applications.
 */

import colors from '../../external/yoctocolors-cjs'
import { centerText, repeatString } from '../strings'

export interface HeaderOptions {
  width?: number
  borderChar?: string
  padding?: number
  color?: 'cyan' | 'green' | 'yellow' | 'blue' | 'magenta' | 'red' | 'gray'
  bold?: boolean
}

/**
 * Create a formatted header/banner.
 */
export function createHeader(title: string, options?: HeaderOptions): string {
  const {
    bold = true,
    borderChar = '=',
    color = 'cyan',
    padding = 1,
    width = 80,
  } = { __proto__: null, ...options } as HeaderOptions

  const border = repeatString(borderChar, width)

  // Apply color and bold
  let formattedTitle = title
  if (color && colors[color]) {
    formattedTitle = colors[color](formattedTitle)
  }
  if (bold && colors.bold) {
    formattedTitle = colors.bold(formattedTitle)
  }

  const centeredTitle = centerText(formattedTitle, width)
  const paddingLine = repeatString(' ', width)

  const lines: string[] = [border]

  for (let i = 0; i < padding; i++) {
    lines.push(paddingLine)
  }

  lines.push(centeredTitle)

  for (let i = 0; i < padding; i++) {
    lines.push(paddingLine)
  }

  lines.push(border)

  return lines.join('\n')
}

/**
 * Create a simple section header.
 */
export function createSectionHeader(
  title: string,
  options?: HeaderOptions,
): string {
  const {
    borderChar = '-',
    color = 'blue',
    width = 60,
  } = { __proto__: null, ...options } as HeaderOptions

  return createHeader(title, {
    width,
    borderChar,
    padding: 0,
    color,
    bold: false,
  })
}

/**
 * Print a header directly to stdout.
 * Standard formatting: 55 chars wide with ═ borders.
 */
export function printHeader(title: string): void {
  const border = repeatString('═', 55)
  console.log(border)
  console.log(`  ${title}`)
  console.log(border)
}

/**
 * Print a footer with optional message.
 * Uses ─ as the border character.
 */
export function printFooter(message?: string): void {
  const border = repeatString('─', 55)
  console.log(border)
  if (message) {
    console.log(colors.green(message))
  }
}
