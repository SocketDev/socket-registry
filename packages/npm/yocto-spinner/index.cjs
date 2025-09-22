'use strict'

const { defineProperty: ObjectDefineProperty } = Object

const defaultTtyColumns = 80

let _defaultSpinner
function getDefaultSpinner() {
  if (_defaultSpinner === undefined) {
    _defaultSpinner = {
      frames: isUnicodeSupported()
        ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        : ['-', '\\', '|', '/'],
      interval: 80,
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
      warning: colors.yellow(supported ? '⚠' : '‼'),
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
    _yoctocolors = { .../*@__PURE__*/ require('yoctocolors-cjs') }
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
    const nodeUtil = /*@__PURE__*/ require('util')
    _stripVTControlCharacters = nodeUtil.stripVTControlCharacters
  }
  return _stripVTControlCharacters(string)
}

function getFrame(spinner, index) {
  const { frames } = spinner
  const length = frames?.length ?? 0
  return index > -1 && index < length ? frames[index].trim() : ''
}

function getFrameCount(spinner) {
  const { frames } = spinner
  const length = frames?.length ?? 0
  return length < 1 ? 1 : length
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trimStart() : ''
}

class YoctoSpinner {
  #color
  #currentFrame = -1
  #exitHandlerBound
  #indention = ''
  #isInteractive
  #isSpinning = false
  #lastSpinnerFrameTime = 0
  #lines = 0
  #spinner
  #stream
  #text
  #timer

  static spinners = {
    get default() {
      return getDefaultSpinner()
    },
    set default(spinner) {
      ObjectDefineProperty(this, 'default', {
        __proto__: null,
        configurable: true,
        enumerable: true,
        value: spinner,
        writable: true,
      })
    },
    ci: {
      frames: [''],
      // The delay argument is converted to a signed 32-bit integer. This effectively
      // limits delay to 2147483647 ms, roughly 24.8 days, since it's specified as a
      // signed integer in the IDL.
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval?utm_source=chatgpt.com#return_value
      interval: 2147483647,
    },
  }

  constructor(options = {}) {
    const opts = { __proto__: null, ...options }
    const stream = opts.stream ?? getProcess().stderr
    this.#spinner =
      opts.spinner ?? YoctoSpinner.spinners.default ?? getDefaultSpinner()
    this.#text = normalizeText(options.text)
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
      now - this.#lastSpinnerFrameTime >= this.#spinner.interval
    ) {
      this.#currentFrame = ++this.#currentFrame % getFrameCount(this.#spinner)
      this.#lastSpinnerFrameTime = now
    }

    const colors = getYoctocolors()
    const applyColor = colors[this.#color] ?? colors.cyan
    const frame = getFrame(this.#spinner, this.#currentFrame)
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

  get spinner() {
    return this.#spinner
  }

  set spinner(spinner) {
    this.#spinner = spinner
  }

  get text() {
    return this.#text
  }

  set text(value) {
    this.#text = normalizeText(value)
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
    const normalized = normalizeText(text)
    if (normalized) {
      this.#text = normalized
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
      }, this.#spinner.interval)
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
