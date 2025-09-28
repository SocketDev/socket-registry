// The 'signal-exit' package is browser safe.
// Do NOT defer loading, otherwise mystery errors may occur at the end of the
// event loop.
import { onExit } from '../signal-exit'

const abortController = new AbortController()

// Detect ^C, i.e. Ctrl + C.
onExit((_code, _signal) => {
  abortController.abort()
})

export default abortController
