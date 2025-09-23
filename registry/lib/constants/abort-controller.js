'use strict'

// The 'signal-exit' package is browser safe.
// Do NOT defer loading, otherwise mystery errors may occur at the end of the
// event loop.
const { onExit } = /*@__PURE__*/ require('../signal-exit')

const abortController = new AbortController()

// Detect ^C, i.e. Ctrl + C.
onExit(() => {
  abortController.abort()
})

module.exports = abortController
