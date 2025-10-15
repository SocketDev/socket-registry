/**
 * Progress bar utilities for CLI applications.
 * Provides various progress indicators including bars, percentages, and spinners.
 */

import colors from '../../external/yoctocolors-cjs'
import { repeatString, stripAnsi } from '../strings'

export interface ProgressBarOptions {
  width?: number
  // Template: ':bar :percent :current/:total :eta'.
  format?: string
  complete?: string
  incomplete?: string
  head?: string
  clear?: boolean
  renderThrottle?: number
  stream?: NodeJS.WriteStream
  color?: 'cyan' | 'green' | 'yellow' | 'blue' | 'magenta'
}

export class ProgressBar {
  private current: number = 0
  private total: number
  private startTime: number
  private lastRender: number = 0
  private stream: NodeJS.WriteStream
  private options: Required<ProgressBarOptions>
  private terminated: boolean = false
  private lastDrawnWidth: number = 0

  constructor(total: number, options?: ProgressBarOptions) {
    this.total = total
    this.startTime = Date.now()
    this.stream = options?.stream || process.stderr
    this.options = {
      width: 40,
      format: ':bar :percent :current/:total',
      complete: '█',
      incomplete: '░',
      head: '',
      clear: false,
      // ~60fps.
      renderThrottle: 16,
      stream: this.stream,
      color: 'cyan',
      ...options,
    }
  }

  /**
   * Update progress and redraw bar.
   */
  update(current: number, tokens?: Record<string, unknown>): void {
    if (this.terminated) {
      return
    }

    this.current = Math.min(current, this.total)

    // Throttle rendering
    const now = Date.now()
    if (
      now - this.lastRender < this.options.renderThrottle &&
      this.current < this.total
    ) {
      return
    }
    this.lastRender = now

    this.render(tokens)

    if (this.current >= this.total) {
      this.terminate()
    }
  }

  /**
   * Increment progress by amount.
   */
  tick(amount: number = 1, tokens?: Record<string, unknown>): void {
    this.update(this.current + amount, tokens)
  }

  /**
   * Render the progress bar.
   */
  private render(tokens?: Record<string, unknown>): void {
    const colorFn = colors[this.options.color] || ((s: string) => s)

    // Calculate values
    const percent = Math.floor((this.current / this.total) * 100)
    const elapsed = Date.now() - this.startTime
    const eta =
      this.current === 0
        ? 0
        : (elapsed / this.current) * (this.total - this.current)

    // Build bar
    const availableWidth = this.options.width
    const filledWidth = Math.floor((this.current / this.total) * availableWidth)
    const emptyWidth = availableWidth - filledWidth

    const filled = repeatString(this.options.complete, filledWidth)
    const empty = repeatString(this.options.incomplete, emptyWidth)
    const bar = colorFn(filled) + empty

    // Format output
    let output = this.options.format
    output = output.replace(':bar', bar)
    output = output.replace(':percent', `${percent}%`)
    output = output.replace(':current', String(this.current))
    output = output.replace(':total', String(this.total))
    output = output.replace(':elapsed', this.formatTime(elapsed))
    output = output.replace(':eta', this.formatTime(eta))

    // Replace custom tokens
    if (tokens) {
      for (const [key, value] of Object.entries(tokens)) {
        output = output.replace(`:${key}`, String(value))
      }
    }

    // Clear line and write
    this.clearLine()
    this.stream.write(output)
    this.lastDrawnWidth = stripAnsi(output).length
  }

  /**
   * Clear the current line.
   */
  private clearLine(): void {
    if (this.stream.isTTY) {
      this.stream.cursorTo(0)
      this.stream.clearLine(0)
    } else if (this.lastDrawnWidth > 0) {
      this.stream.write(`\r${repeatString(' ', this.lastDrawnWidth)}\r`)
    }
  }

  /**
   * Format time in seconds to human readable.
   */
  private formatTime(ms: number): string {
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m${remainingSeconds}s`
  }

  /**
   * Terminate the progress bar.
   */
  terminate(): void {
    if (this.terminated) {
      return
    }
    this.terminated = true

    if (this.options.clear) {
      this.clearLine()
    } else {
      this.stream.write('\n')
    }
  }
}

/**
 * Create a simple progress indicator without a bar.
 */
export function createProgressIndicator(
  current: number,
  total: number,
  label?: string,
): string {
  const percent = Math.floor((current / total) * 100)
  const progress = `${current}/${total}`

  let output = ''
  if (label) {
    output += `${label}: `
  }

  output += `${colors.cyan(`[${percent}%]`)} ${progress}`

  return output
}
