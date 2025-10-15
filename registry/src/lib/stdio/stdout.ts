/**
 * Standard output stream utilities.
 * Provides utilities for writing to stdout with formatting and control.
 */

import { WriteStream } from 'node:tty'

// Get the actual stdout stream
const stdout: NodeJS.WriteStream = process.stdout

/**
 * Write a line to stdout.
 */
export function writeLine(text: string = ''): void {
  stdout.write(`${text}\n`)
}

/**
 * Write text to stdout without newline.
 */
export function write(text: string): void {
  stdout.write(text)
}

/**
 * Clear the current line on stdout.
 */
export function clearLine(): void {
  if (stdout.isTTY) {
    stdout.cursorTo(0)
    stdout.clearLine(0)
  }
}

/**
 * Move cursor to position on stdout.
 */
export function cursorTo(x: number, y?: number): void {
  if (stdout.isTTY) {
    stdout.cursorTo(x, y)
  }
}

/**
 * Clear screen from cursor down.
 */
export function clearScreenDown(): void {
  if (stdout.isTTY) {
    stdout.clearScreenDown()
  }
}

/**
 * Check if stdout is a TTY.
 */
export function isTTY(): boolean {
  return stdout.isTTY || false
}

/**
 * Get terminal columns for stdout.
 */
export function getColumns(): number {
  return stdout.columns || 80
}

/**
 * Get terminal rows for stdout.
 */
export function getRows(): number {
  return stdout.rows || 24
}

/**
 * Hide cursor on stdout.
 */
export function hideCursor(): void {
  if (stdout.isTTY && stdout instanceof WriteStream) {
    stdout.write('\u001B[?25l')
  }
}

/**
 * Show cursor on stdout.
 */
export function showCursor(): void {
  if (stdout.isTTY && stdout instanceof WriteStream) {
    stdout.write('\u001B[?25h')
  }
}

/**
 * Ensure cursor is shown on exit.
 */
export function ensureCursorOnExit(): void {
  process.on('exit', showCursor)
  process.on('SIGINT', () => {
    showCursor()
    // eslint-disable-next-line n/no-process-exit
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    showCursor()
    // eslint-disable-next-line n/no-process-exit
    process.exit(143)
  })
}

// Export the raw stream for advanced usage
export { stdout }
