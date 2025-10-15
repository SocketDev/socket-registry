/**
 * @fileoverview Terminal clearing and cursor utilities.
 * Provides functions for clearing lines, screens, and managing cursor position.
 */

/**
 * Clear the current line.
 */
export function clearLine(stream: NodeJS.WriteStream = process.stdout): void {
  if (stream.isTTY) {
    // TTY: Use cursor control
    stream.cursorTo(0)
    stream.clearLine(0)
  } else {
    // Non-TTY: Use ANSI escape codes
    stream.write('\r\x1b[K')
  }
}

/**
 * Clear lines above the current position.
 */
export function clearLines(
  count: number,
  stream: NodeJS.WriteStream = process.stdout,
): void {
  for (let i = 0; i < count; i++) {
    // Move up and clear line
    stream.write('\x1b[1A\x1b[2K')
  }
}

/**
 * Clear the entire screen.
 */
export function clearScreen(stream: NodeJS.WriteStream = process.stdout): void {
  if (stream.isTTY) {
    // Clear screen and move cursor to top-left
    stream.write('\x1bc')
  }
}

/**
 * Clear the visible terminal screen (alias for clearScreen).
 */
export function clearVisible(
  stream: NodeJS.WriteStream = process.stdout,
): void {
  clearScreen(stream)
}

/**
 * Move cursor to beginning of line.
 */
export function cursorToStart(
  stream: NodeJS.WriteStream = process.stdout,
): void {
  if (stream.isTTY) {
    stream.cursorTo(0)
  } else {
    stream.write('\r')
  }
}

/**
 * Hide the cursor.
 */
export function hideCursor(stream: NodeJS.WriteStream = process.stdout): void {
  stream.write('\x1b[?25l')
}

/**
 * Show the cursor.
 */
export function showCursor(stream: NodeJS.WriteStream = process.stdout): void {
  stream.write('\x1b[?25h')
}

/**
 * Save cursor position.
 */
export function saveCursor(stream: NodeJS.WriteStream = process.stdout): void {
  stream.write('\x1b7')
}

/**
 * Restore cursor position.
 */
export function restoreCursor(
  stream: NodeJS.WriteStream = process.stdout,
): void {
  stream.write('\x1b8')
}
