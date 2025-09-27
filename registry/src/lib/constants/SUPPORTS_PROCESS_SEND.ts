'use strict'

// Forked subprocesses have the process.send method.
// https://nodejs.org/api/child_process.html#subprocesssendmessage-sendhandle-options-callback
module.exports = typeof process.send === 'function'
