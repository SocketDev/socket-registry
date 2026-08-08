'use strict'

// Upstream ships the RegExp.prototype[Symbol.matchAll] implementation as a
// public module; the native method is that implementation at this floor.
module.exports = RegExp.prototype[Symbol.matchAll]
