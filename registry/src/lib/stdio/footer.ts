/**
 * Console footer/summary formatting utilities.
 * Provides consistent footer and summary formatting for CLI applications.
 */

import colors from '../../external/yoctocolors-cjs'
import { repeatString } from '../strings'

export interface FooterOptions {
  width?: number | undefined
  borderChar?: string | undefined
  showTimestamp?: boolean | undefined
  showDuration?: boolean | undefined
  startTime?: number | undefined
  color?:
    | 'cyan'
    | 'green'
    | 'yellow'
    | 'blue'
    | 'magenta'
    | 'red'
    | 'gray'
    | undefined
}

export interface SummaryStats {
  total?: number | undefined
  success?: number | undefined
  failed?: number | undefined
  skipped?: number | undefined
  warnings?: number | undefined
  errors?: number | undefined
  duration?: number | undefined
}

/**
 * Create a formatted footer.
 */
export function createFooter(
  message?: string,
  options?: FooterOptions,
): string {
  const {
    borderChar = '=',
    color = 'gray',
    showDuration = false,
    showTimestamp = false,
    startTime,
    width = 80,
  } = { __proto__: null, ...options } as FooterOptions

  const border = repeatString(borderChar, width)
  const lines: string[] = []

  if (message) {
    const colorFn = color && colors[color] ? colors[color] : (s: string) => s
    lines.push(colorFn(message))
  }

  if (showTimestamp) {
    const timestamp = new Date().toISOString()
    lines.push(colors.gray(`Completed at: ${timestamp}`))
  }

  if (showDuration && startTime) {
    const duration = Date.now() - startTime
    const seconds = (duration / 1000).toFixed(2)
    lines.push(colors.gray(`Duration: ${seconds}s`))
  }

  lines.push(border)
  return lines.join('\n')
}

/**
 * Create a summary footer with statistics.
 */
export function createSummaryFooter(
  stats: SummaryStats,
  options?: FooterOptions,
): string {
  const parts: string[] = []

  if (stats.total !== undefined) {
    parts.push(`Total: ${stats.total}`)
  }

  if (stats.success !== undefined) {
    parts.push(colors.green(`✓ ${stats.success} passed`))
  }

  if (stats.failed !== undefined && stats.failed > 0) {
    parts.push(colors.red(`✗ ${stats.failed} failed`))
  }

  if (stats.skipped !== undefined && stats.skipped > 0) {
    parts.push(colors.yellow(`○ ${stats.skipped} skipped`))
  }

  if (stats.warnings !== undefined && stats.warnings > 0) {
    parts.push(colors.yellow(`⚠ ${stats.warnings} warnings`))
  }

  if (stats.errors !== undefined && stats.errors > 0) {
    parts.push(colors.red(`✗ ${stats.errors} errors`))
  }

  const message = parts.join(' | ')
  return createFooter(message, {
    ...options,
    showDuration: stats.duration !== undefined,
    ...(stats.duration !== undefined && { startTime: stats.duration }),
  })
}
