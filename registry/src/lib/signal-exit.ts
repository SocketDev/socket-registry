/**
 * @fileoverview Process signal handling utilities.
 * Provides cross-platform signal exit detection and cleanup handlers.
 */

// Inlined signal-exit:
// https://socket.dev/npm/package/signal-exit/overview/4.1.0
// ISC License
// Copyright (c) 2015-2023 Benjamin Coe, Isaac Z. Schlueter, and Contributors

// This is not the set of all possible signals.
//
// It IS, however, the set of all signals that trigger
// an exit on either Linux or BSD systems. Linux is a
// superset of the signal names supported on BSD, and
// the unknown signals just fail to register, so we can
// catch that easily enough.
//
// Don't bother with SIGKILL. It's uncatchable, which
// means that we can't fire any callbacks anyway.
//
// If a user does happen to register a handler on a non-
// fatal signal like SIGWINCH or something, and then
// exit, it'll end up firing `process.emit('exit')`, so
// the handler will be fired anyway.
//
// SIGBUS, SIGFPE, SIGSEGV and SIGILL, when not raised
// artificially, inherently leave the process in a
// state from which it is not safe to try and enter JS
// listeners.

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ReflectApply = Reflect.apply
const globalProcess = globalThis.process as
  | (NodeJS.Process & {
      __signal_exit_emitter__?: any
      reallyExit?: (code?: number | undefined) => never
    })
  | undefined
const originalProcessEmit = globalProcess?.emit
const platform = globalProcess?.platform ?? ''
const originalProcessReallyExit = globalProcess?.reallyExit as
  | ((code?: number | undefined) => never)
  | undefined
const WIN32 = platform === 'win32'

let _events: typeof import('node:events') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getEvents() {
  if (_events === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _events = /*@__PURE__*/ require('events')
  }
  return _events!
}

// Type for tracking emitted signals.
type EmittedSignals = {
  // Using string as signals can include custom events like 'exit' and 'afterexit'.
  [signal: string]: boolean
}

type SignalExitEmitter = import('node:events').EventEmitter & {
  count?: number
  emitted?: EmittedSignals
  infinite?: boolean
}
let _emitter: SignalExitEmitter | undefined
/*@__NO_SIDE_EFFECTS__*/
function getEmitter() {
  if (_emitter === undefined) {
    if (globalProcess && globalProcess.__signal_exit_emitter__) {
      _emitter = globalProcess.__signal_exit_emitter__
    } else if (globalProcess) {
      const EventEmitter = getEvents().EventEmitter
      _emitter = globalProcess.__signal_exit_emitter__ =
        new EventEmitter() as SignalExitEmitter
      _emitter.count = 0
      _emitter.emitted = { __proto__: null } as unknown as EmittedSignals
    }
    // Because this emitter is a global, we have to check to see if a
    // previous version of this library failed to enable infinite listeners.
    // I know what you're about to say.  But literally everything about
    // signal-exit is a compromise with evil.  Get used to it.
    if (_emitter && !_emitter.infinite) {
      _emitter.setMaxListeners(Infinity)
      _emitter.infinite = true
    }
  }
  return _emitter!
}

type SignalListener = () => void
// Type for signal listeners indexed by signal name.
type SignalListenerMap = {
  [signal: string]: SignalListener
}
let _sigListeners: SignalListenerMap | undefined
/*@__NO_SIDE_EFFECTS__*/
function getSignalListeners() {
  if (_sigListeners === undefined) {
    _sigListeners = { __proto__: null } as unknown as SignalListenerMap
    const emitter = getEmitter()
    const sigs = getSignals()
    for (const sig of sigs) {
      _sigListeners[sig] = function listener() {
        // If there are no other listeners, an exit is coming!
        // Simplest way: remove us and then re-send the signal.
        // We know that this will kill the process, so we can
        // safely emit now.
        const listeners = globalProcess?.listeners(sig as NodeJS.Signals) || []
        if (listeners.length === emitter.count) {
          unload()
          emit('exit', null, sig)
          emit('afterexit', null, sig)
          // "SIGHUP" throws an `ENOSYS` error on Windows,
          // so use a supported signal instead.
          const killSig = WIN32 && sig === 'SIGHUP' ? 'SIGINT' : sig
          globalProcess?.kill(globalProcess?.pid, killSig)
        }
      }
    }
  }
  return _sigListeners!
}

let _signals: string[] | undefined
/*@__NO_SIDE_EFFECTS__*/
function getSignals() {
  if (_signals === undefined) {
    _signals = ['SIGABRT', 'SIGALRM', 'SIGHUP', 'SIGINT', 'SIGTERM']
    if (!WIN32) {
      _signals.push(
        'SIGVTALRM',
        'SIGXCPU',
        'SIGXFSZ',
        'SIGUSR2',
        'SIGTRAP',
        'SIGSYS',
        'SIGQUIT',
        'SIGIOT',
        // should detect profiler and enable/disable accordingly.
        // see #21
        // 'SIGPROF'
      )
    }
    if (platform === 'linux') {
      _signals.push('SIGIO', 'SIGPOLL', 'SIGPWR', 'SIGSTKFLT', 'SIGUNUSED')
    }
  }
  return _signals!
}

/*@__NO_SIDE_EFFECTS__*/
function emit(event: string, code: number | null, signal: string | null): void {
  const emitter = getEmitter()
  if (emitter.emitted && emitter.emitted[event]) {
    return
  }
  if (emitter.emitted) {
    emitter.emitted[event] = true
  }
  emitter.emit(event, code, signal)
}

let loaded = false
/*@__NO_SIDE_EFFECTS__*/
export function load(): void {
  if (loaded || !globalProcess) {
    return
  }
  loaded = true

  // This is the number of onSignalExit's that are in play.
  // It's important so that we can count the correct number of
  // listeners on signals, and don't wait for the other one to
  // handle it instead of us.
  const emitter = getEmitter()
  if (emitter.count !== undefined) {
    emitter.count += 1
  }

  const sigs = getSignals()
  const sigListeners = getSignalListeners()
  _signals = sigs.filter(sig => {
    try {
      globalProcess.on(sig as NodeJS.Signals, sigListeners[sig]!)
      return true
    } catch {}
    return false
  })

  globalProcess.emit = processEmit as typeof globalProcess.emit
  globalProcess.reallyExit = processReallyExit
}

/*@__NO_SIDE_EFFECTS__*/
function processEmit(
  this: NodeJS.Process,
  eventName: string,
  exitCode?: number | undefined,
  ...args: any[]
): boolean {
  if (eventName === 'exit') {
    if (exitCode == undefined) {
      const processExitCode = globalProcess?.exitCode
      exitCode =
        typeof processExitCode === 'number' ? processExitCode : undefined
    } else if (globalProcess) {
      globalProcess.exitCode = exitCode
    }
    const result = ReflectApply(originalProcessEmit!, this, [
      eventName,
      exitCode,
      ...args,
    ]) as boolean
    const numExitCode = typeof exitCode === 'number' ? exitCode : null
    emit('exit', numExitCode, null)
    emit('afterexit', numExitCode, null)
    return result
  }
  return ReflectApply(originalProcessEmit!, this, [
    eventName,
    exitCode,
    ...args,
  ]) as boolean
}

/*@__NO_SIDE_EFFECTS__*/
function processReallyExit(code?: number | undefined): never {
  const exitCode = code || 0
  if (globalProcess) {
    globalProcess.exitCode = exitCode
  }
  emit('exit', exitCode, null)
  emit('afterexit', exitCode, null)
  ReflectApply(originalProcessReallyExit!, globalProcess, [exitCode])
  throw new Error('processReallyExit should never return')
}

export interface OnExitOptions {
  alwaysLast?: boolean
}

/*@__NO_SIDE_EFFECTS__*/
export function onExit(
  cb: (code: number | null, signal: string | null) => void,
  options?: OnExitOptions | undefined,
): () => void {
  if (!globalProcess) {
    return function remove() {}
  }
  if (typeof cb !== 'function') {
    throw new TypeError('a callback must be provided for exit handler')
  }
  if (loaded === false) {
    load()
  }
  const { alwaysLast } = { __proto__: null, ...options } as OnExitOptions

  let eventName = 'exit'
  if (alwaysLast) {
    eventName = 'afterexit'
  }

  const emitter = getEmitter()
  emitter.on(eventName, cb)

  return function remove() {
    emitter.removeListener(eventName, cb)
    if (
      !emitter.listeners('exit').length &&
      !emitter.listeners('afterexit').length
    ) {
      unload()
    }
  }
}

/*@__NO_SIDE_EFFECTS__*/
export function signals(): string[] | undefined {
  return _signals
}

/*@__NO_SIDE_EFFECTS__*/
export function unload(): void {
  if (!loaded || !globalProcess) {
    return
  }
  loaded = false

  const sigs = getSignals()
  const sigListeners = getSignalListeners()
  for (const sig of sigs) {
    try {
      globalProcess.removeListener(sig as NodeJS.Signals, sigListeners[sig]!)
    } catch {}
  }
  globalProcess.emit = originalProcessEmit!
  globalProcess.reallyExit = originalProcessReallyExit!
  const emitter = getEmitter()
  if (emitter.count !== undefined) {
    emitter.count -= 1
  }
}
