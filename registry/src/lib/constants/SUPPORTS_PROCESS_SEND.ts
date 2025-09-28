// Forked subprocesses have the process.send method.
// https://nodejs.org/api/child_process.html#subprocesssendmessage-sendhandle-options-callback
export default typeof process.send === 'function'
