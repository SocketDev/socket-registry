/**
 * @fileoverview Progress bar utilities for Socket Registry v2.0.
 */

/**
 * Progress bar for CLI operations.
 */
export class ProgressBar {
  private current = 0
  private total: number
  private width: number
  private description: string

  constructor(total: number, description = '', width = 40) {
    this.total = total
    this.width = width
    this.description = description
  }

  /**
   * Update progress.
   */
  update(current: number, description?: string): void {
    this.current = Math.min(current, this.total)
    if (description) {
      this.description = description
    }
    this.render()
  }

  /**
   * Increment progress.
   */
  increment(amount = 1, description?: string): void {
    this.update(this.current + amount, description)
  }

  /**
   * Complete the progress bar.
   */
  complete(): void {
    this.update(this.total)
    // New line after completion.
    console.log()
  }

  private render(): void {
    const percentage = Math.floor((this.current / this.total) * 100)
    const filled = Math.floor((this.current / this.total) * this.width)
    const empty = this.width - filled

    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    const status = `${this.current}/${this.total}`

    process.stdout.write(
      `\r${this.description} ${bar} ${percentage}% ${status}  `,
    )
  }
}

/**
 * Create a progress bar.
 */
export function createProgressBar(
  total: number,
  description?: string,
): ProgressBar {
  return new ProgressBar(total, description)
}

/**
 * Run tasks with progress tracking.
 */
export async function withProgress<T>(
  tasks: Array<() => Promise<T>>,
  description = 'Processing',
): Promise<T[]> {
  const progress = createProgressBar(tasks.length, description)
  const results: T[] = []

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (task) {
      // eslint-disable-next-line no-await-in-loop
      const result = await task()
      results.push(result)
      progress.increment()
    }
  }

  progress.complete()
  return results
}
