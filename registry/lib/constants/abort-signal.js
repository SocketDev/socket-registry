'use strict'

const abortSignal = /*@__PURE__*/ require('./abort-controller').signal

// By manually setting `kMaxEventTargetListeners` on `abortSignal` we avoid:
//   TypeError [ERR_INVALID_ARG_TYPE]: The "emitter" argument must be an
//   instance of EventEmitter or EventTarget. Received an instance of
//   AbortSignal
//
// in some patch releases of Node 18-23 when calling events.getMaxListeners(abortSignal).
// See https://github.com/nodejs/node/pull/56807.
//
// Instead of calling events.setMaxListeners(10, abortSignal) we set the symbol
// property directly to keep the constants initialization platform agnostic and
// not rely on the Node specific 'node:events' module up front.
const symbols = Object.getOwnPropertySymbols(abortSignal)
const kMaxEventTargetListeners = symbols.find(
  s => s.description === 'events.maxEventTargetListeners'
)
if (kMaxEventTargetListeners) {
  // The default events.defaultMaxListeners value is 10.
  // https://nodejs.org/api/events.html#eventsdefaultmaxlisteners
  abortSignal[kMaxEventTargetListeners] = 10
}

module.exports = abortSignal
