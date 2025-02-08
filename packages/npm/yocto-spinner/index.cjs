'use strict'

const process = require('node:process')
const { stripVTControlCharacters } = require('node:util')

const yoctocolors = require('yoctocolors-cjs')

function isInteractive(stream) {
  return Boolean(
    stream.isTTY && process.env.TERM !== 'dumb' && !('CI' in process.env)
  )
}

const isUnicodeSupported = (() => {
  const { env } = process
  const { TERM, TERM_PROGRAM } = env
  if (process.platform !== 'win32') {
    return TERM !== 'linux' // Linux console (kernel)
  }
  return (
    Boolean(env.WT_SESSION) || // Windows Terminal
    Boolean(env.TERMINUS_SUBLIME) || // Terminus (<0.2.27)
    env.ConEmuTask === '{cmd::Cmder}' || // ConEmu and cmder
    TERM_PROGRAM === 'Terminus-Sublime' ||
    TERM_PROGRAM === 'vscode' ||
    TERM === 'xterm-256color' ||
    TERM === 'alacritty' ||
    TERM === 'rxvt-unicode' ||
    TERM === 'rxvt-unicode-256color' ||
    env.TERMINAL_EMULATOR === 'JetBrains-JediTerm'
  )
})()

const errorSymbol = yoctocolors.red(isUnicodeSupported ? '✖️' : '×')
const infoSymbol = yoctocolors.blue(isUnicodeSupported ? 'ℹ' : 'i')
const successSymbol = yoctocolors.green(isUnicodeSupported ? '✔' : '√')
const warningSymbol = yoctocolors.yellow(isUnicodeSupported ? '⚠' : '‼')

const defaultSpinner = {
  frames: isUnicodeSupported
    ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    : ['-', '\\', '|', '/'],
  interval: 80
}

class YoctoSpinner {
  #color
  #currentFrame = -1
  #exitHandlerBound
  #frames
  #interval
  #isInteractive
  #lastSpinnerFrameTime = 0
  #lines = 0
  #stream
  #text
  #timer

  constructor(options = {}) {
    const spinner = options.spinner ?? defaultSpinner
    const stream = options.stream ?? process.stderr
    this.#color = options.color ?? 'cyan'
    this.#exitHandlerBound = this.#exitHandler.bind(this)
    this.#frames = spinner.frames
    this.#interval = spinner.interval
    this.#isInteractive = isInteractive(stream)
    this.#stream = stream
    this.#text = options.text ?? ''
  }

  get color() {
    return this.#color
  }

  set color(value) {
    this.#color = value
    this.#render()
  }

  get isSpinning() {
    return this.#timer !== undefined
  }

  get text() {
    return this.#text
  }

  set text(value = '') {
    this.#text = value
    this.#render()
  }

  clear() {
    if (!this.#isInteractive) {
      return this
    }
    this.#stream.cursorTo(0)
    for (let index = 0; index < this.#lines; index += 1) {
      if (index > 0) {
        this.#stream.moveCursor(0, -1)
      }
      this.#stream.clearLine(1)
    }
    this.#lines = 0
    return this
  }

  error(text) {
    return this.#symbolStop(errorSymbol, text)
  }

  info(text) {
    return this.#symbolStop(infoSymbol, text)
  }

  start(text) {
    if (text) {
      this.#text = text
    }
    if (this.isSpinning) {
      return this
    }
    this.#hideCursor()
    this.#render()
    this.#subscribeToProcessEvents()
    this.#timer = setInterval(() => {
      this.#render()
    }, this.#interval)
    return this
  }

  stop(finalText) {
    if (!this.isSpinning) {
      return this
    }
    clearInterval(this.#timer)
    this.#timer = undefined
    this.#showCursor()
    this.clear()
    this.#unsubscribeFromProcessEvents()
    if (finalText) {
      this.#stream.write(`${finalText}\n`)
    }
    return this
  }

  success(text) {
    return this.#symbolStop(successSymbol, text)
  }

  warning(text) {
    return this.#symbolStop(warningSymbol, text)
  }

  #exitHandler() {
    if (this.isSpinning) {
      this.stop()
    }
  }

  #hideCursor() {
    if (this.#isInteractive) {
      this.#write('\u001B[?25l')
    }
  }

  #lineCount(text) {
    const width = this.#stream.columns ?? 80
    const lines = stripVTControlCharacters(text).split('\n')
    let lineCount = 0
    for (const line of lines) {
      lineCount += Math.max(1, Math.ceil(line.length / width))
    }
    return lineCount
  }

  #render() {
    // Ensure we only update the spinner frame at the wanted interval,
    // even if the frame method is called more often.
    const now = Date.now()
    if (
      this.#currentFrame === -1 ||
      now - this.#lastSpinnerFrameTime >= this.#interval
    ) {
      this.#currentFrame = (this.#currentFrame + 1) % this.#frames.length
      this.#lastSpinnerFrameTime = now
    }
    const applyColor = yoctocolors[this.#color] ?? yoctocolors.cyan
    const frame = this.#frames[this.#currentFrame]
    let string = `${applyColor(frame)} ${this.#text}`
    if (!this.#isInteractive) {
      string += '\n'
    }
    this.clear()
    this.#write(string)
    if (this.#isInteractive) {
      this.#lines = this.#lineCount(string)
    }
  }

  #showCursor() {
    if (this.#isInteractive) {
      this.#write('\u001B[?25h')
    }
  }

  #subscribeToProcessEvents() {
    process.once('SIGINT', this.#exitHandlerBound)
    process.once('SIGTERM', this.#exitHandlerBound)
  }

  #symbolStop(symbol, text) {
    return this.stop(`${symbol} ${text ?? this.#text}`)
  }

  #unsubscribeFromProcessEvents() {
    process.off('SIGINT', this.#exitHandlerBound)
    process.off('SIGTERM', this.#exitHandlerBound)
  }

  #write(text) {
    this.#stream.write(text)
  }
}

module.exports = function yoctoSpinner(options) {
  return new YoctoSpinner(options)
}
