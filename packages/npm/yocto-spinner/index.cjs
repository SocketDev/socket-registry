'use strict'

const { isArray: ArrayIsArray } = Array
const { defineProperty: ObjectDefineProperty } = Object

const defaultTtyColumns = 80

// SGR formatter, inlined verbatim from yoctocolors-cjs@2.1.3 (MIT) so the
// override carries no runtime dependency. Same open/close codes, same
// nested-close handling, and the same hasColors gate, so output is
// byte-identical to the package it replaces.
function formatColor(open, close) {
  if (!hasColorSupport()) {
    return input => input
  }
  const openCode = `[${open}m`
  const closeCode = `[${close}m`
  return input => {
    const string = `${input}`
    let index = string.indexOf(closeCode)
    if (index === -1) {
      return openCode + string + closeCode
    }
    let result = openCode
    let lastIndex = 0
    // SGR 22 resets both bold (1) and dim (2); reopen the outer style on a
    // nested close for those.
    const reopenOnNestedClose = close === 22
    const replaceCode = (reopenOnNestedClose ? closeCode : '') + openCode
    while (index !== -1) {
      result += string.slice(lastIndex, index) + replaceCode
      lastIndex = index + closeCode.length
      index = string.indexOf(closeCode, lastIndex)
    }
    result += string.slice(lastIndex) + closeCode
    return result
  }
}

let defaultSpinnerCache
function getDefaultSpinner() {
  if (defaultSpinnerCache === undefined) {
    defaultSpinnerCache = {
      frames: isUnicodeSupported()
        ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        : ['-', '\\', '|', '/'],
      interval: 80,
    }
  }
  return defaultSpinnerCache
}

function getFrame(spinner, index) {
  const { frames } = spinner
  const len = frames?.length ?? 0
  return index > -1 && index < len ? frames[index] : ''
}

function getFrameCount(spinner) {
  const { frames } = spinner
  const len = frames?.length ?? 0
  return len < 1 ? 1 : len
}

let logSymbolsCache
function getLogSymbols() {
  if (logSymbolsCache === undefined) {
    const supported = isUnicodeSupported()
    const colors = getYoctocolors()
    logSymbolsCache = {
      error: colors.red(supported ? '✖' : '×'),
      info: colors.blue(supported ? 'ℹ' : 'i'),
      // oxlint-disable-next-line socket/no-status-emoji -- Vendored upstream log symbol; published module shape must match.
      success: colors.green(supported ? '✔' : '√'),
      // oxlint-disable-next-line socket/no-status-emoji -- Vendored upstream log symbol; published module shape must match.
      warning: colors.yellow(supported ? '⚠' : '‼'),
    }
  }
  return logSymbolsCache
}

let processCache
function getProcess() {
  if (processCache === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    processCache = require('node:process')
  }
  return processCache
}

// [name, openCode, closeCode] for the full yoctocolors palette, so
// colors[name] resolves for any color a caller passes as the spinner color.
const YOCTOCOLORS_SPEC = [
  ['reset', 0, 0],
  ['bold', 1, 22],
  ['dim', 2, 22],
  ['italic', 3, 23],
  ['underline', 4, 24],
  ['overline', 53, 55],
  ['inverse', 7, 27],
  ['hidden', 8, 28],
  ['strikethrough', 9, 29],
  ['black', 30, 39],
  ['red', 31, 39],
  ['green', 32, 39],
  ['yellow', 33, 39],
  ['blue', 34, 39],
  ['magenta', 35, 39],
  ['cyan', 36, 39],
  ['white', 37, 39],
  ['gray', 90, 39],
  ['bgBlack', 40, 49],
  ['bgRed', 41, 49],
  ['bgGreen', 42, 49],
  ['bgYellow', 43, 49],
  ['bgBlue', 44, 49],
  ['bgMagenta', 45, 49],
  ['bgCyan', 46, 49],
  ['bgWhite', 47, 49],
  ['bgGray', 100, 49],
  ['redBright', 91, 39],
  ['greenBright', 92, 39],
  ['yellowBright', 93, 39],
  ['blueBright', 94, 39],
  ['magentaBright', 95, 39],
  ['cyanBright', 96, 39],
  ['whiteBright', 97, 39],
  ['bgRedBright', 101, 49],
  ['bgGreenBright', 102, 49],
  ['bgYellowBright', 103, 49],
  ['bgBlueBright', 104, 49],
  ['bgMagentaBright', 105, 49],
  ['bgCyanBright', 106, 49],
  ['bgWhiteBright', 107, 49],
]

let yoctocolorsCache
function getYoctocolors() {
  if (yoctocolorsCache === undefined) {
    const colors = { __proto__: null }
    for (let i = 0, { length } = YOCTOCOLORS_SPEC; i < length; i += 1) {
      const entry = YOCTOCOLORS_SPEC[i]
      colors[entry[0]] = formatColor(entry[1], entry[2])
    }
    yoctocolorsCache = colors
  }
  return yoctocolorsCache
}

let hasColorsCache
function hasColorSupport() {
  if (hasColorsCache === undefined) {
    const nodeTty = require('node:tty')
    hasColorsCache = nodeTty?.WriteStream?.prototype?.hasColors?.() ?? false
  }
  return hasColorsCache
}

let processInteractiveCache
function isProcessInteractive() {
  if (processInteractiveCache === undefined) {
    const { env } = getProcess()
    processInteractiveCache = env.TERM !== 'dumb' && !('CI' in env)
  }
  return processInteractiveCache
}

let unicodeSupportedCache
function isUnicodeSupported() {
  if (unicodeSupportedCache === undefined) {
    const process = getProcess()
    if (process.platform !== 'win32') {
      // Linux console (kernel).
      unicodeSupportedCache = process.env.TERM !== 'linux'
      return unicodeSupportedCache
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
      unicodeSupportedCache = true
      return unicodeSupportedCache
    }
    const { TERM, TERM_PROGRAM } = env
    unicodeSupportedCache =
      TERM_PROGRAM === 'Terminus-Sublime' ||
      TERM_PROGRAM === 'vscode' ||
      TERM === 'xterm-256color' ||
      TERM === 'alacritty' ||
      TERM === 'rxvt-unicode' ||
      TERM === 'rxvt-unicode-256color' ||
      env.TERMINAL_EMULATOR === 'JetBrains-JediTerm'
  }
  return unicodeSupportedCache
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trimStart() : ''
}

let stripVTControlCharactersCache
function stripVTControlCharacters(string) {
  if (stripVTControlCharactersCache === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    const nodeUtil = /*@__PURE__*/ require('node:util')
    stripVTControlCharactersCache = nodeUtil.stripVTControlCharacters
  }
  return stripVTControlCharactersCache(string)
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
      interval: 2_147_483_647,
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
    if (
      ArrayIsArray(color) &&
      (color.length !== 3 ||
        !color.every(n => typeof n === 'number' && n >= 0 && n <= 255))
    ) {
      throw new TypeError(
        'RGB color must be an array of 3 numbers between 0 and 255',
      )
    }

    this.#color = color
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
    for (let i = 0, { length } = lines; i < length; i += 1) {
      const line = lines[i]
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
    const applyColor = ArrayIsArray(this.#color)
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
