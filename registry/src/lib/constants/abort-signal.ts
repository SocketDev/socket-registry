/**
 * @fileoverview Global AbortSignal instance for coordinating cancellation across the application.
 */

import { setMaxEventTargetListeners } from '../suppress-warnings'
import abortController from './abort-controller'

const abortSignal: AbortSignal = abortController.signal

// Set max listeners to avoid TypeError in some Node 18-23 patch releases.
// See https://github.com/nodejs/node/pull/56807.
setMaxEventTargetListeners(abortSignal)

export default abortSignal
