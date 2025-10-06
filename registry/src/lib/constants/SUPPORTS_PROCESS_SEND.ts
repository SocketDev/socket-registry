/**
 * @fileoverview Boolean flag indicating process.send method availability.
 */

// Forked subprocesses have the process.send method.
// https://nodejs.org/api/child_process.html#subprocesssendmessage-sendhandle-options-callback
export default typeof process.send === 'function'
