'use strict'

const commonjsAssert = require('@socketregistry/original__assert')

module.exports = commonjsAssert
module.exports.AssertionError = commonjsAssert.AssertionError
module.exports.deepEqual = commonjsAssert.deepEqual
module.exports.deepStrictEqual = commonjsAssert.deepStrictEqual
module.exports.doesNotMatch = commonjsAssert.doesNotMatch
module.exports.doesNotReject = commonjsAssert.doesNotReject
module.exports.doesNotThrow = commonjsAssert.doesNotThrow
module.exports.equal = commonjsAssert.equal
module.exports.fail = commonjsAssert.fail
module.exports.ifError = commonjsAssert.ifError
module.exports.match = commonjsAssert.match
module.exports.notDeepEqual = commonjsAssert.notDeepEqual
module.exports.notDeepStrictEqual = commonjsAssert.notDeepStrictEqual
module.exports.notEqual = commonjsAssert.notEqual
module.exports.notStrictEqual = commonjsAssert.notStrictEqual
module.exports.ok = commonjsAssert.ok
module.exports.rejects = commonjsAssert.rejects
module.exports.strict = commonjsAssert.strict
module.exports.strictEqual = commonjsAssert.strictEqual
module.exports.throws = commonjsAssert.throws
