'use strict'

// node:util/types.isArgumentsObject uses internal slots, so it disagrees with
// the package this replaces: upstream is-arguments returns false for any value
// carrying a Symbol.toStringTag and exposes .isLegacyArguments. It rejects even
// a real arguments object that carries such a tag. Serve the faithful portable
// implementation instead.
module.exports = /*@__PURE__*/ require('./index.js')
