'use strict'

const defaultTtyColumns = 80

let _defaultSpinner
function getDefaultSpinner() {
  if (_defaultSpinner === undefined) {
    _defaultSpinner = {
      frames: isUnicodeSupported()
        ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        : ['-', '\\', '|', '/'],
      interval: 80
    }
  }
  return _defaultSpinner
}

let _logSymbols
function getLogSymbols() {
  if (_logSymbols === undefined) {
    const supported = isUnicodeSupported()
    const colors = getYoctocolors()
    _logSymbols = {
      error: colors.red(supported ? '✖' : '×'),
      info: colors.blue(supported ? 'ℹ' : 'i'),
      success: colors.green(supported ? '✔' : '√'),
      warning: colors.yellow(supported ? '⚠' : '‼')
    }
  }
  return _logSymbols
}

let _process
function getProcess() {
  if (_process === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _process = require('process')
  }
  return _process
}

let _yoctocolors
function getYoctocolors() {
  if (_yoctocolors === undefined) {
    _yoctocolors = { ...require('yoctocolors-cjs') }
  }
  return _yoctocolors
}

let _processInteractive
function isProcessInteractive() {
  if (_processInteractive === undefined) {
    const { env } = getProcess()
    _processInteractive = env.TERM !== 'dumb' && !('CI' in env)
  }
  return _processInteractive
}

let _unicodeSupported
function isUnicodeSupported() {
  if (_unicodeSupported === undefined) {
    const process = getProcess()
    if (process.platform !== 'win32') {
      // Linux console (kernel).
      _unicodeSupported = process.env.TERM !== 'linux'
      return _unicodeSupported
    }
    const { env } = process
    if (
      // Windows Terminal.
      env.WT_SESSION ||
      // Terminus (<0.2.27).
      env.TERMINUS_SUBLIME ||
      // ConEmu and cmder.
      env.ConEmuTask === '{cmd::Cmder}'
    ) {
      _unicodeSupported = true
      return _unicodeSupported
    }
    const { TERM, TERM_PROGRAM } = env
    _unicodeSupported =
      TERM_PROGRAM === 'Terminus-Sublime' ||
      TERM_PROGRAM === 'vscode' ||
      TERM === 'xterm-256color' ||
      TERM === 'alacritty' ||
      TERM === 'rxvt-unicode' ||
      TERM === 'rxvt-unicode-256color' ||
      env.TERMINAL_EMULATOR === 'JetBrains-JediTerm'
  }
  return _unicodeSupported
}

let _stripVTControlCharacters
function stripVTControlCharacters(string) {
  if (_stripVTControlCharacters === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _stripVTControlCharacters = require('util').stripVTControlCharacters
  }
  return _stripVTControlCharacters(string)
}

class YoctoSpinner {
  #color
  #currentFrame = -1
  #exitHandlerBound
  #frames
  #indention = ''
  #interval
  #isInteractive
  #isSpinning = false
  #lastSpinnerFrameTime = 0
  #lines = 0
  #stream
  #text
  #timer

  constructor(options = {}) {
    const opts = { __proto__: null, ...options }
    const spinner = opts.spinner ?? getDefaultSpinner()
    const stream = opts.stream ?? getProcess().stderr
    const { frames } = spinner
    this.#frames = (frames?.length ?? 0) < 1 ? [''] : frames.map(f => f.trim())
    this.#interval = spinner.interval
    this.#text = options.text ?? ''
    this.#stream = stream ?? process.stderr
    this.#color = options.color ?? 'cyan'
    this.#isInteractive = !!stream.isTTY && isProcessInteractive()
    this.#exitHandlerBound = this.#exitHandler.bind(this)
  }

  #exitHandler(signal) {
    if (this.isSpinning) {
      this.stop()
    }
    // SIGINT: 128 + 2
    // SIGTERM: 128 + 15
    const exitCode = signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1
    // eslint-disable-next-line n/no-process-exit
    process.exit(exitCode)
  }

  #hideCursor() {
    if (this.#isInteractive) {
      this.#write('\u001B[?25l')
    }
  }

  #lineCount(text) {
    const width = this.#stream.columns ?? defaultTtyColumns
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
      this.#currentFrame = ++this.#currentFrame % this.#frames.length
      this.#lastSpinnerFrameTime = now
    }

    const colors = getYoctocolors()
    const applyColor = colors[this.#color] ?? colors.cyan
    const frame = this.#frames[this.#currentFrame]
    let string = `${frame ? `${applyColor(frame)} ` : ''}${this.#text}`

    if (string) {
      if (this.#indention.length) {
        string = `${this.#indention}${string}`
      }
      if (!this.#isInteractive) {
        string += '\n'
      }
    }

    if (this.#isInteractive) {
      this.clear()
    }
    if (string) {
      this.#write(string)
    }
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

  #symbolStop(symbolType, text) {
    const symbols = getLogSymbols()
    return this.stop(`${symbols[symbolType]} ${text ?? this.#text}`)
  }

  #write(text) {
    this.#stream.write(text)
  }

  #unsubscribeFromProcessEvents() {
    process.off('SIGINT', this.#exitHandlerBound)
    process.off('SIGTERM', this.#exitHandlerBound)
  }

  get color() {
    return this.#color
  }

  set color(value) {
    this.#color = value
    this.#render()
  }

  get isSpinning() {
    return this.#isSpinning
  }

  get text() {
    return this.#text
  }

  set text(value) {
    this.#text = value ?? ''
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

  dedent(spaces = 2) {
    this.#indention = this.#indention.slice(0, -spaces)
    return this
  }

  error(text) {
    return this.#symbolStop('error', text)
  }

  indent(spaces = 2) {
    this.#indention += ' '.repeat(spaces)
    return this
  }

  info(text) {
    return this.#symbolStop('info', text)
  }

  resetIndent() {
    this.#indention = ''
    return this
  }

  start(text) {
    if (text) {
      this.#text = text
    }

    if (this.isSpinning) {
      return this
    }

    this.#isSpinning = true
    this.#hideCursor()
    this.#render()
    this.#subscribeToProcessEvents()

    // Only start the timer in interactive mode
    if (this.#isInteractive) {
      this.#timer = setInterval(() => {
        this.#render()
      }, this.#interval)
    }

    return this
  }

  stop(finalText) {
    if (!this.isSpinning) {
      return this
    }

    this.#isSpinning = false
    if (this.#timer) {
      clearInterval(this.#timer)
      this.#timer = undefined
    }

    this.#showCursor()
    this.clear()
    this.#unsubscribeFromProcessEvents()

    if (finalText) {
      this.#write(`${this.#indention}${finalText}\n`)
    }

    return this
  }

  success(text) {
    return this.#symbolStop('success', text)
  }

  warning(text) {
    return this.#symbolStop('warning', text)
  }
}

module.exports = function yoctoSpinner(options) {
  return new YoctoSpinner(options)
}
