'use strict'

const { parse: JSONParse } = JSON

const { stripBom } = /*@__PURE__*/ require('./strings')

/**
 * Check if a value is a Buffer instance.
 * @param {any} x - The value to check.
 * @returns {boolean} True if the value is a Buffer.
 */
/*@__NO_SIDE_EFFECTS__*/
function isBuffer(x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') {
    return false
  }
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false
  }
  if (x.length > 0 && typeof x[0] !== 'number') {
    return false
  }

  const Ctor = x.constructor
  return !!(typeof Ctor?.isBuffer === 'function' && Ctor.isBuffer(x))
}

/**
 * Check if a value is a JSON primitive (null, boolean, number, or string).
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value is a JSON primitive.
 */
/*@__NO_SIDE_EFFECTS__*/
function isJsonPrimitive(value) {
  return (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  )
}

/**
 * Parse JSON content with error handling and BOM stripping.
 * @param {string | Buffer} content - The JSON content to parse.
 * @param {{filepath?: string; reviver?: Function; throws?: boolean}} [options] - Parse options.
 * @returns {any} The parsed JSON object, or null if parsing fails and throws is false.
 */
/*@__NO_SIDE_EFFECTS__*/
function jsonParse(content, options) {
  const { filepath, reviver, throws } = { __proto__: null, ...options }
  const shouldThrow = throws === undefined || !!throws
  const jsonStr = isBuffer(content) ? content.toString('utf8') : content
  try {
    return JSONParse(stripBom(jsonStr), reviver)
  } catch (e) {
    if (shouldThrow) {
      if (e && typeof filepath === 'string') {
        e.message = `${filepath}: ${e.message}`
      }
      throw e
    }
  }
  return null
}
module.exports = {
  isJsonPrimitive,
  jsonParse
}
