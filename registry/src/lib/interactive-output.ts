/**
 * @fileoverview Low-level interactive output control with keyboard shortcuts.
 * Provides building blocks for masking output and handling keyboard input.
 */

import type { ChildProcess } from 'node:child_process'
import readline from 'node:readline'

export interface KeyboardHandler {
  /** Setup keyboard handling */
  enable(): void
  /** Cleanup keyboard handling */
  disable(): void
  /** Add key handler */
  on(key: string, handler: () => void): void
  /** Remove key handler */
  off(key: string): void
}

export interface OutputMask {
  /** Whether output is currently masked */
  masked: boolean
  /** Buffer for masked output */
  buffer: string[]
  /** Maximum buffer size */
  maxBufferSize: number
}

/**
 * Create a keyboard handler for interactive controls.
 * Handles Ctrl+key combinations.
 */
export function createKeyboardHandler(): KeyboardHandler {
  const handlers = new Map<string, () => void>()
  let enabled = false
  let keypressHandler: ((str: string, key: readline.Key) => void) | undefined

  return {
    enable() {
      if (enabled || !process.stdin.isTTY) return

      readline.emitKeypressEvents(process.stdin)
      process.stdin.setRawMode(true)

      keypressHandler = (_str: string, key: readline.Key) => {
        if (key && key.ctrl) {
          const handler = handlers.get(key.name || '')
          if (handler) {
            handler()
          }
        }
      }

      process.stdin.on('keypress', keypressHandler)
      enabled = true
    },

    disable() {
      if (!enabled || !keypressHandler) return

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
        process.stdin.removeListener('keypress', keypressHandler)
      }
      enabled = false
    },

    on(key: string, handler: () => void) {
      handlers.set(key, handler)
    },

    off(key: string) {
      handlers.delete(key)
    }
  }
}

/**
 * Create an output mask controller.
 * Buffers output when masked, passes through when unmasked.
 */
export function createOutputMask(options: {
  maxBufferSize?: number
  onToggle?: (masked: boolean) => void
} = {}): OutputMask & {
  toggle(): void
  handleData(data: Buffer | string): string | null
  flush(): string[]
} {
  const mask: OutputMask = {
    masked: true,
    buffer: [],
    maxBufferSize: options.maxBufferSize || 1000
  }

  return {
    ...mask,

    toggle() {
      mask.masked = !mask.masked
      if (options.onToggle) {
        options.onToggle(mask.masked)
      }
    },

    handleData(data: Buffer | string): string | null {
      const text = typeof data === 'string' ? data : data.toString()

      if (mask.masked) {
        // Buffer the output
        mask.buffer.push(text)

        // Keep buffer size reasonable
        const lines = mask.buffer.join('').split('\n')
        if (lines.length > mask.maxBufferSize) {
          mask.buffer = [lines.slice(-mask.maxBufferSize).join('\n')]
        }
        return null
      }

      return text
    },

    flush(): string[] {
      const output = [...mask.buffer]
      mask.buffer = []
      return output
    }
  }
}

/**
 * Attach output masking to a child process.
 * Returns a controller for managing the masking.
 */
export function attachOutputMask(
  child: ChildProcess,
  options: {
    masked?: boolean
    maxBufferSize?: number
    onToggle?: (masked: boolean) => void
  } = {}
): {
  mask: ReturnType<typeof createOutputMask>
  keyboard: KeyboardHandler
  cleanup: () => void
} {
  const mask = createOutputMask({
    maxBufferSize: options.maxBufferSize,
    onToggle: options.onToggle
  })

  const keyboard = createKeyboardHandler()

  // Set initial state
  if (options.masked !== undefined) {
    mask.masked = options.masked
  }

  // Handle stdout
  if (child.stdout) {
    child.stdout.on('data', (data: Buffer) => {
      const output = mask.handleData(data)
      if (output !== null) {
        process.stdout.write(output)
      }
    })
  }

  // Handle stderr
  if (child.stderr) {
    child.stderr.on('data', (data: Buffer) => {
      const output = mask.handleData(data)
      if (output !== null) {
        process.stderr.write(output)
      }
    })
  }

  // Cleanup function
  const cleanup = () => {
    keyboard.disable()
  }

  // Auto-cleanup on exit
  child.on('exit', cleanup)
  child.on('error', cleanup)

  return { mask, keyboard, cleanup }
}

/**
 * Clear the current terminal line.
 */
export function clearLine(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\r\x1b[K')
  }
}

/**
 * Write output with proper line clearing.
 */
export function writeOutput(text: string): void {
  clearLine()
  process.stdout.write(text)
}