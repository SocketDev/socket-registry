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
  return index > -1 && index < length ? frames[index] : ''
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
  #onFrameUpdate
  #onRenderFrame
  #skipRender = false
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

    // Validate and set color (named color or RGB tuple).
    const color = options.color ?? 'cyan'
    if (Array.isArray(color)) {
      if (
        color.length !== 3 ||
        !color.every(n => typeof n === 'number' && n >= 0 && n <= 255)
      ) {
        throw new TypeError(
          'RGB color must be an array of 3 numbers between 0 and 255',
        )
      }
      this.#color = color
    } else {
      this.#color = color
    }

    this.#isInteractive = !!stream.isTTY && isProcessInteractive()
    this.#exitHandlerBound = this.#exitHandler.bind(this)
    this.#onFrameUpdate = options.onFrameUpdate
    this.#onRenderFrame = options.onRenderFrame
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
    // Don't render if spinner was stopped (prevents race with clearInterval).
    if (!this.#isSpinning) {
      return
    }

    // Ensure we only update the spinner frame at the wanted interval,
    // even if the frame method is called more often.
    const now = Date.now()
    let frameAdvanced = false
    if (
      this.#currentFrame === -1 ||
      now - this.#lastSpinnerFrameTime >= this.#spinner.interval
    ) {
      frameAdvanced = true
      this.#currentFrame = ++this.#currentFrame % getFrameCount(this.#spinner)
      this.#lastSpinnerFrameTime = now
    }

    // Call frame update callback if provided.
    // This allows external shimmer logic to advance in sync with renders.
    // Set flag to prevent nested renders from text updates.
    if (frameAdvanced && typeof this.#onFrameUpdate === 'function') {
      this.#skipRender = true
      try {
        this.#onFrameUpdate()
      } finally {
        this.#skipRender = false
      }
    }

    const colors = getYoctocolors()
    // Support both color names and RGB tuples
    const applyColor = Array.isArray(this.#color)
      ? text =>
          `\x1b[38;2;${this.#color[0]};${this.#color[1]};${this.#color[2]}m${text}\x1b[39m`
      : (colors[this.#color] ?? colors.cyan)
    const frame = getFrame(this.#spinner, this.#currentFrame)

    let string
    if (typeof this.#onRenderFrame === 'function') {
      // Use custom render callback for full control over frame + text layout.
      // Callback receives: frame, text, applyColor function.
      string = this.#onRenderFrame(frame, this.#text, applyColor)
    } else {
      // Default rendering: frame with single space + text.
      // Legacy behavior preserved for ecosystem compatibility.
      // Consumers can use onRenderFrame callback for custom spacing logic.
      string = `${frame ? `${applyColor(frame)} ` : ''}${this.#text}`
    }

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
    // Use 2 spaces to match padded narrow frames (stars get extra space to align with wide lightning)
    return this.stop(`${symbols[symbolType]}  ${text ?? this.#text}`)
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
    // Check if subclass wants to override with a method
    if (this._textMethod) {
      // Return the method itself so it can be called
      return this._textMethod
    }
    return this.#text
  }

  set text(value) {
    // Check if subclass wants to override with a method but avoid recursion
    if (this._textMethod && !this._inTextSetter) {
      // Set flag to prevent recursion
      this._inTextSetter = true
      try {
        // When setting, call the method with the value
        this._textMethod(value)
      } finally {
        this._inTextSetter = false
      }
      return
    }
    this.#text = normalizeText(value)
    // Skip render if we're inside onFrameUpdate callback.
    // The current render cycle will use the updated text.
    if (!this.#skipRender) {
      this.#render()
    }
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

    // Clear timer FIRST to minimize race window.
    if (this.#timer) {
      clearInterval(this.#timer)
      this.#timer = undefined
    }

    // Then set flag to prevent any queued renders from executing.
    this.#isSpinning = false

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
