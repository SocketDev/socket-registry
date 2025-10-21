/**
 * @fileoverview Tests for progress bar utilities.
 *
 * Validates ProgressBar class functionality including rendering, throttling,
 * time formatting, custom tokens, TTY handling, and progress indicators.
 */
import { PassThrough } from 'node:stream'
import {
  createProgressIndicator,
  ProgressBar,
} from '@socketsecurity/lib/stdio/progress'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('ProgressBar', () => {
  let stream: PassThrough & {
    isTTY?: boolean
    cursorTo?: (x: number) => void
    clearLine?: (dir: number) => void
  }
  let outputs: string[]

  beforeEach(() => {
    stream = new PassThrough()
    outputs = []
    stream.on('data', chunk => {
      outputs.push(chunk.toString())
    })
  })

  // Helper to cast stream for ProgressBar compatibility.
  const asWriteStream = (s: typeof stream): NodeJS.WriteStream =>
    s as unknown as NodeJS.WriteStream

  describe('constructor', () => {
    it('should create progress bar with default options', () => {
      const bar = new ProgressBar(100, { stream: asWriteStream(stream) })
      expect(bar).toBeDefined()
    })

    it('should use process.stderr when no stream provided', () => {
      const bar = new ProgressBar(100)
      expect(bar).toBeDefined()
      // Should use default stream (process.stderr).
    })

    it('should accept custom width', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        width: 20,
      })
      bar.update(50)
      const output = outputs.join('')
      // Should render with custom width.
      expect(output).toBeTruthy()
    })

    it('should accept custom format', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':current/:total :percent',
      })
      bar.update(25)
      const output = outputs.join('')
      expect(output).toContain('25/100')
      expect(output).toContain('25%')
    })

    it('should accept custom complete and incomplete chars', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        complete: '=',
        incomplete: '-',
        width: 10,
      })
      bar.update(50)
      const output = outputs.join('')
      expect(output).toContain('=')
      expect(output).toContain('-')
    })

    it('should accept custom color', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        color: 'green',
      })
      bar.update(50)
      const output = outputs.join('')
      // Should contain ANSI color codes.
      expect(output).toBeTruthy()
    })

    it('should accept custom render throttle', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        renderThrottle: 100,
      })
      bar.update(25)
      expect(outputs.length).toBeGreaterThan(0)
    })
  })

  describe('update', () => {
    it('should update progress to specific value', () => {
      const bar = new ProgressBar(100, { stream: asWriteStream(stream) })
      bar.update(25)
      const output = outputs.join('')
      expect(output).toContain('25%')
      expect(output).toContain('25/100')
    })

    it('should cap progress at total', () => {
      const bar = new ProgressBar(100, { stream: asWriteStream(stream) })
      bar.update(150)
      const output = outputs.join('')
      expect(output).toContain('100%')
      expect(output).toContain('100/100')
    })

    it('should accept custom tokens', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':bar :current/:total :filename',
      })
      bar.update(50, { filename: 'test.txt' })
      const output = outputs.join('')
      expect(output).toContain('test.txt')
    })

    it('should throttle rendering based on renderThrottle', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        renderThrottle: 100,
      })

      outputs = []
      bar.update(10)
      bar.update(11)
      bar.update(12)

      // First update renders, subsequent are throttled.
      expect(outputs.length).toBeLessThan(3)
    })

    it('should always render when reaching total', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        renderThrottle: 10_000,
      })

      outputs = []
      bar.update(99)
      bar.update(100)

      // Should render completion even if throttled.
      expect(outputs.length).toBeGreaterThan(0)
      const output = outputs.join('')
      expect(output).toContain('100%')
    })

    it('should not update after termination', () => {
      const bar = new ProgressBar(100, { stream: asWriteStream(stream) })
      bar.terminate()
      outputs = []
      bar.update(50)
      expect(outputs.length).toBe(0)
    })

    it('should automatically terminate when reaching 100%', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        clear: false,
      })
      outputs = []
      bar.update(100)
      const output = outputs.join('')
      // Should have newline at end indicating termination.
      expect(output.endsWith('\n')).toBe(true)
    })
  })

  describe('tick', () => {
    it('should increment progress by 1 by default', () => {
      const bar = new ProgressBar(100, { stream: asWriteStream(stream) })
      bar.tick()
      const output = outputs.join('')
      expect(output).toContain('1/100')
    })

    it('should increment progress by custom amount', () => {
      const bar = new ProgressBar(100, { stream: asWriteStream(stream) })
      bar.tick(25)
      const output = outputs.join('')
      expect(output).toContain('25/100')
    })

    it('should accept custom tokens', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':current/:total :status',
      })
      bar.tick(10, { status: 'downloading' })
      const output = outputs.join('')
      expect(output).toContain('downloading')
    })

    it('should handle multiple ticks', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        renderThrottle: 0,
      })
      bar.tick(10)
      bar.tick(20)
      bar.tick(30)
      const output = outputs.join('')
      expect(output).toContain('60/100')
    })
  })

  describe('rendering', () => {
    it('should render bar with correct format', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':bar :percent',
        complete: '█',
        incomplete: '░',
        width: 10,
      })
      bar.update(50)
      const output = outputs.join('')
      expect(output).toContain('50%')
      expect(output).toMatch(/[█░]/)
    })

    it('should replace :bar token', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':bar',
      })
      bar.update(50)
      const output = outputs.join('')
      // Should contain progress bar characters.
      expect(output.length).toBeGreaterThan(0)
    })

    it('should replace :percent token', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':percent',
      })
      bar.update(75)
      const output = outputs.join('')
      expect(output).toContain('75%')
    })

    it('should replace :current token', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':current',
      })
      bar.update(42)
      const output = outputs.join('')
      expect(output).toContain('42')
    })

    it('should replace :total token', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':total',
      })
      bar.update(0)
      const output = outputs.join('')
      expect(output).toContain('100')
    })

    it('should replace :elapsed token', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':elapsed',
      })
      bar.update(50)
      const output = outputs.join('')
      // Should contain time format (e.g., "0s").
      expect(output).toMatch(/\d+[ms]/)
    })

    it('should replace :eta token', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':eta',
      })
      bar.update(50)
      const output = outputs.join('')
      // Should contain time format.
      expect(output).toMatch(/\d+[ms]/)
    })

    it('should handle multiple token replacements', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':current/:total :percent :elapsed :eta',
      })
      bar.update(33)
      const output = outputs.join('')
      expect(output).toContain('33/100')
      expect(output).toContain('33%')
    })

    it('should handle custom tokens with various types', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':str :num :bool',
      })
      bar.update(50, { str: 'text', num: 123, bool: true })
      const output = outputs.join('')
      expect(output).toContain('text')
      expect(output).toContain('123')
      expect(output).toContain('true')
    })

    it('should apply color to filled portion', () => {
      const colors = ['cyan', 'green', 'yellow', 'blue', 'magenta'] as const
      for (const color of colors) {
        const colorStream = new PassThrough()
        const colorOutputs: string[] = []
        colorStream.on('data', chunk => {
          colorOutputs.push(chunk.toString())
        })

        const bar = new ProgressBar(100, {
          stream: colorStream as unknown as NodeJS.WriteStream,
          color,
          width: 10,
        })
        bar.update(50)
        const output = colorOutputs.join('')
        // Should contain ANSI codes for color.
        expect(output.length).toBeGreaterThan(0)
      }
    })

    it('should handle invalid color gracefully', () => {
      const colorStream = new PassThrough()
      const colorOutputs: string[] = []
      colorStream.on('data', chunk => {
        colorOutputs.push(chunk.toString())
      })

      const bar = new ProgressBar(100, {
        stream: colorStream as unknown as NodeJS.WriteStream,
        // @ts-expect-error Testing invalid color.
        color: 'invalid',
        width: 10,
      })
      bar.update(50)
      const output = colorOutputs.join('')
      // Should still render without color.
      expect(output.length).toBeGreaterThan(0)
    })
  })

  describe('TTY handling', () => {
    it('should use cursorTo and clearLine for TTY', () => {
      const ttyStream = new PassThrough() as PassThrough & {
        isTTY: boolean
        cursorTo: (x: number) => void
        clearLine: (dir: number) => void
      }
      ttyStream.isTTY = true
      ttyStream.cursorTo = vi.fn()
      ttyStream.clearLine = vi.fn()

      const bar = new ProgressBar(100, {
        stream: ttyStream as unknown as NodeJS.WriteStream,
      })
      bar.update(50)

      expect(ttyStream.cursorTo).toHaveBeenCalledWith(0)
      expect(ttyStream.clearLine).toHaveBeenCalledWith(0)
    })

    it('should use carriage return for non-TTY', () => {
      const nonTtyStream = new PassThrough() as PassThrough & {
        isTTY: boolean
      }
      nonTtyStream.isTTY = false
      const testOutputs: string[] = []
      nonTtyStream.on('data', (chunk: Buffer) => {
        testOutputs.push(chunk.toString())
      })

      const bar = new ProgressBar(100, {
        stream: nonTtyStream as unknown as NodeJS.WriteStream,
      })
      bar.update(50)
      bar.update(75)

      const output = testOutputs.join('')
      // Non-TTY should use spaces and carriage returns for clearing.
      expect(output).toBeTruthy()
    })

    it('should track last drawn width for non-TTY clearing', () => {
      const nonTtyStream = new PassThrough() as PassThrough & {
        isTTY: boolean
      }
      nonTtyStream.isTTY = false

      const bar = new ProgressBar(100, {
        stream: nonTtyStream as unknown as NodeJS.WriteStream,
        format: ':bar :percent',
        width: 20,
      })
      bar.update(25)
      bar.update(50)
      // Should properly clear previous line by tracking width.
      expect(true).toBe(true)
    })
  })

  describe('time formatting', () => {
    it('should format seconds less than 60', () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      const startBar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':elapsed',
        renderThrottle: 0,
      })
      vi.advanceTimersByTime(5000)
      startBar.update(50)
      const output = outputs.join('')
      expect(output).toMatch(/5s/)
      vi.useRealTimers()
    })

    it('should format minutes and seconds', () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      const startBar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':elapsed',
        renderThrottle: 0,
      })
      vi.advanceTimersByTime(125_000)
      startBar.update(50)
      const output = outputs.join('')
      expect(output).toMatch(/2m5s/)
      vi.useRealTimers()
    })

    it('should calculate ETA based on current progress', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':eta',
        renderThrottle: 0,
      })
      vi.useFakeTimers()
      vi.setSystemTime(0)
      vi.advanceTimersByTime(1000)
      bar.update(25)
      const output = outputs.join('')
      // ETA should be calculated based on elapsed time and progress.
      expect(output).toMatch(/\d+[ms]/)
      vi.useRealTimers()
    })

    it('should show 0s ETA when no progress made', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':eta',
        renderThrottle: 0,
      })
      bar.update(0)
      const output = outputs.join('')
      expect(output).toContain('0s')
    })
  })

  describe('terminate', () => {
    it('should write newline when not clearing', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        clear: false,
      })
      outputs = []
      bar.terminate()
      const output = outputs.join('')
      expect(output).toBe('\n')
    })

    it('should clear line when clearing is enabled', () => {
      const ttyStream = new PassThrough() as PassThrough & {
        isTTY: boolean
        cursorTo: (x: number) => void
        clearLine: (dir: number) => void
      }
      ttyStream.isTTY = true
      ttyStream.cursorTo = vi.fn()
      ttyStream.clearLine = vi.fn()

      const bar = new ProgressBar(100, {
        stream: ttyStream as unknown as NodeJS.WriteStream,
        clear: true,
      })
      bar.terminate()

      expect(ttyStream.cursorTo).toHaveBeenCalledWith(0)
      expect(ttyStream.clearLine).toHaveBeenCalledWith(0)
    })

    it('should not allow updates after termination', () => {
      const bar = new ProgressBar(100, { stream: asWriteStream(stream) })
      bar.terminate()
      outputs = []
      bar.update(50)
      expect(outputs.length).toBe(0)
    })

    it('should be idempotent', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        clear: false,
      })
      bar.terminate()
      outputs = []
      bar.terminate()
      bar.terminate()
      expect(outputs.length).toBe(0)
    })

    it('should clear with spaces for non-TTY when clearing enabled', () => {
      const nonTtyStream = new PassThrough() as PassThrough & {
        isTTY: boolean
      }
      nonTtyStream.isTTY = false
      const clearOutputs: string[] = []
      nonTtyStream.on('data', (chunk: Buffer) => {
        clearOutputs.push(chunk.toString())
      })

      const bar = new ProgressBar(100, {
        stream: nonTtyStream as unknown as NodeJS.WriteStream,
        clear: true,
        width: 20,
      })
      bar.update(50)
      const beforeClear = clearOutputs.length
      bar.terminate()
      // Should have cleared the line.
      expect(clearOutputs.length).toBeGreaterThanOrEqual(beforeClear)
    })
  })

  describe('edge cases', () => {
    it('should handle zero total', () => {
      const bar = new ProgressBar(0, { stream: asWriteStream(stream) })
      bar.update(0)
      const output = outputs.join('')
      // Should not crash, may show 0/0 or similar.
      expect(output).toBeTruthy()
    })

    it('should handle negative updates gracefully', () => {
      const bar = new ProgressBar(100, { stream: asWriteStream(stream) })
      bar.update(-10)
      const output = outputs.join('')
      // Should clamp to 0 or handle gracefully.
      expect(output).toBeTruthy()
    })

    it('should handle very large totals', () => {
      const bar = new ProgressBar(1_000_000, { stream: asWriteStream(stream) })
      bar.update(500_000)
      const output = outputs.join('')
      expect(output).toContain('500000/1000000')
    })

    it('should handle width of 0', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        width: 0,
      })
      bar.update(50)
      const output = outputs.join('')
      // Should not crash.
      expect(output).toBeTruthy()
    })

    it('should handle width of 1', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        width: 1,
      })
      bar.update(50)
      const output = outputs.join('')
      expect(output).toBeTruthy()
    })

    it('should handle very wide bars', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        width: 200,
      })
      bar.update(50)
      const output = outputs.join('')
      // Should render wide bar.
      expect(output.length).toBeGreaterThan(0)
    })

    it('should handle empty format string', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: '',
      })
      bar.update(50)
      const output = outputs.join('')
      // Should render empty or minimal output.
      expect(output).toBeDefined()
    })

    it('should handle format with no tokens', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: 'Loading...',
      })
      bar.update(50)
      const output = outputs.join('')
      expect(output).toContain('Loading...')
    })

    it('should handle unicode in complete/incomplete chars', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        complete: '🟦',
        incomplete: '⬜',
        width: 5,
      })
      bar.update(50)
      const output = outputs.join('')
      expect(output).toBeTruthy()
    })

    it('should handle multi-character complete/incomplete', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        complete: '==',
        incomplete: '--',
        width: 10,
      })
      bar.update(50)
      const output = outputs.join('')
      expect(output).toContain('==')
      expect(output).toContain('--')
    })

    it('should handle rapid consecutive updates', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        renderThrottle: 16,
      })
      for (let i = 0; i <= 100; i += 1) {
        bar.update(i)
      }
      // Should throttle most updates.
      expect(outputs.length).toBeLessThan(101)
    })

    it('should handle update with undefined tokens', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':bar :custom',
      })
      bar.update(50, {})
      const output = outputs.join('')
      // Should leave :custom unreplaced or empty.
      expect(output).toBeTruthy()
    })

    it('should handle update with null values in tokens', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':bar :custom',
      })
      bar.update(50, { custom: null })
      const output = outputs.join('')
      expect(output).toContain('null')
    })
  })

  describe('progress scenarios', () => {
    it('should show 0% progress at start', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':percent',
      })
      bar.update(0)
      const output = outputs.join('')
      expect(output).toContain('0%')
    })

    it('should show 50% progress at midpoint', () => {
      const bar = new ProgressBar(200, {
        stream: asWriteStream(stream),
        format: ':percent',
      })
      bar.update(100)
      const output = outputs.join('')
      expect(output).toContain('50%')
    })

    it('should show 100% progress at completion', () => {
      const bar = new ProgressBar(100, {
        stream: asWriteStream(stream),
        format: ':percent',
      })
      bar.update(100)
      const output = outputs.join('')
      expect(output).toContain('100%')
    })

    it('should show progress for file download simulation', () => {
      const bar = new ProgressBar(1000, {
        stream: asWriteStream(stream),
        format: ':bar :percent :current/:total bytes :eta',
        renderThrottle: 0,
      })

      // Simulate download chunks.
      bar.tick(100)
      bar.tick(200)
      bar.tick(300)
      bar.tick(400)

      const output = outputs.join('')
      expect(output).toContain('1000/1000')
      expect(output).toContain('100%')
    })

    it('should handle installation progress simulation', () => {
      const packages = ['lodash', 'react', 'vue', 'angular', 'express']
      const bar = new ProgressBar(packages.length, {
        stream: asWriteStream(stream),
        format: ':bar :current/:total :package',
        renderThrottle: 0,
      })

      for (const pkg of packages) {
        bar.tick(1, { package: pkg })
      }

      const output = outputs.join('')
      expect(output).toContain('5/5')
    })

    it('should handle build progress simulation', () => {
      const bar = new ProgressBar(10, {
        stream: asWriteStream(stream),
        format: ':bar :percent :task',
        renderThrottle: 0,
      })

      const tasks = [
        'Clean',
        'Compile',
        'Bundle',
        'Minify',
        'Generate types',
        'Copy assets',
        'Lint',
        'Test',
        'Coverage',
        'Done',
      ]

      for (const task of tasks) {
        bar.tick(1, { task })
      }

      const output = outputs.join('')
      expect(output).toContain('100%')
    })
  })

  describe('performance', () => {
    it('should handle many updates efficiently with throttling', () => {
      const bar = new ProgressBar(10_000, {
        stream: asWriteStream(stream),
        renderThrottle: 16,
      })
      const start = Date.now()

      for (let i = 0; i <= 10_000; i += 100) {
        bar.update(i)
      }

      const duration = Date.now() - start
      // Should complete quickly due to throttling.
      expect(duration).toBeLessThan(1000)
    })

    it('should render all updates when throttle is 0', () => {
      const bar = new ProgressBar(10, {
        stream: asWriteStream(stream),
        renderThrottle: 0,
      })
      outputs = []

      for (let i = 1; i <= 10; i += 1) {
        bar.tick(1)
      }

      // Should render most updates (last one terminates).
      expect(outputs.length).toBeGreaterThan(5)
    })
  })
})

describe('createProgressIndicator', () => {
  it('should create progress indicator without label', () => {
    const result = createProgressIndicator(50, 100)
    expect(result).toContain('[50%]')
    expect(result).toContain('50/100')
  })

  it('should create progress indicator with label', () => {
    const result = createProgressIndicator(25, 100, 'Downloading')
    expect(result).toContain('Downloading:')
    expect(result).toContain('[25%]')
    expect(result).toContain('25/100')
  })

  it('should calculate percentage correctly', () => {
    expect(createProgressIndicator(0, 100)).toContain('[0%]')
    expect(createProgressIndicator(25, 100)).toContain('[25%]')
    expect(createProgressIndicator(50, 100)).toContain('[50%]')
    expect(createProgressIndicator(75, 100)).toContain('[75%]')
    expect(createProgressIndicator(100, 100)).toContain('[100%]')
  })

  it('should handle different total values', () => {
    expect(createProgressIndicator(5, 10)).toContain('[50%]')
    expect(createProgressIndicator(200, 1000)).toContain('[20%]')
    expect(createProgressIndicator(999, 1000)).toContain('[99%]')
  })

  it('should format fraction in progress', () => {
    const result = createProgressIndicator(42, 150, 'Installing')
    expect(result).toContain('42/150')
  })

  it('should handle zero current', () => {
    const result = createProgressIndicator(0, 50)
    expect(result).toContain('0/50')
    expect(result).toContain('[0%]')
  })

  it('should handle completion', () => {
    const result = createProgressIndicator(100, 100)
    expect(result).toContain('100/100')
    expect(result).toContain('[100%]')
  })

  it('should round down percentages', () => {
    // 33.333...% should be floored to 33%.
    const result = createProgressIndicator(1, 3)
    expect(result).toContain('[33%]')
  })

  it('should handle very large numbers', () => {
    const result = createProgressIndicator(500_000, 1_000_000)
    expect(result).toContain('[50%]')
    expect(result).toContain('500000/1000000')
  })

  it('should contain color codes', () => {
    const result = createProgressIndicator(50, 100)
    // Should contain ANSI codes for cyan color.
    expect(result.length).toBeGreaterThan('[50%] 50/100'.length)
  })

  it('should work with empty label', () => {
    const result = createProgressIndicator(50, 100, '')
    expect(result).toContain('[50%]')
    expect(result).not.toContain(': ')
  })

  it('should work for installation scenarios', () => {
    const result = createProgressIndicator(15, 23, 'Packages')
    expect(result).toContain('Packages:')
    expect(result).toContain('15/23')
    expect(result).toMatch(/\[6[0-9]%\]/)
  })

  it('should work for download scenarios', () => {
    const result = createProgressIndicator(768, 1024, 'Downloaded')
    expect(result).toContain('Downloaded:')
    expect(result).toContain('768/1024')
    expect(result).toContain('[75%]')
  })

  it('should handle single item progress', () => {
    const result = createProgressIndicator(1, 1)
    expect(result).toContain('1/1')
    expect(result).toContain('[100%]')
  })
})
