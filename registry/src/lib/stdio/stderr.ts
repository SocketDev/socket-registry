/**
 * Standard error stream utilities.
 * Provides utilities for writing to stderr with formatting and control.
 */

// Get the actual stderr stream
const stderr: NodeJS.WriteStream = process.stderr

/**
 * Write an error line to stderr.
 */
export function writeErrorLine(text: string = ''): void {
  stderr.write(`${text}\n`)
}

/**
 * Write error text to stderr without newline.
 */
export function writeError(text: string): void {
  stderr.write(text)
}

/**
 * Clear the current line on stderr.
 */
export function clearLine(): void {
  if (stderr.isTTY) {
    stderr.cursorTo(0)
    stderr.clearLine(0)
  }
}

/**
 * Move cursor to position on stderr.
 */
export function cursorTo(x: number, y?: number): void {
  if (stderr.isTTY) {
    stderr.cursorTo(x, y)
  }
}

/**
 * Check if stderr is a TTY.
 */
export function isTTY(): boolean {
  return stderr.isTTY || false
}

/**
 * Get terminal columns for stderr.
 */
export function getColumns(): number {
  return stderr.columns || 80
}

/**
 * Get terminal rows for stderr.
 */
export function getRows(): number {
  return stderr.rows || 24
}

/**
 * Write a warning to stderr with formatting.
 */
export function writeWarning(
  message: string,
  prefix: string = 'Warning',
): void {
  const formatted = `${prefix}: ${message}`
  writeErrorLine(formatted)
}

/**
 * Write an error to stderr with formatting.
 */
export function writeErrorFormatted(
  message: string,
  prefix: string = 'Error',
): void {
  const formatted = `${prefix}: ${message}`
  writeErrorLine(formatted)
}

/**
 * Write stack trace to stderr.
 */
export function writeStackTrace(error: Error): void {
  if (error.stack) {
    writeErrorLine(error.stack)
  } else {
    writeErrorFormatted(error.message)
  }
}

// Export the raw stream for advanced usage
export { stderr }
