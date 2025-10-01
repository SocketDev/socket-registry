'use strict'

module.exports = function indentString(input, count = 1, options) {
  let includeEmptyLines = false
  let indent = ' '
  if (
    // isV2: indentString(input, indent, count) - 3 args only
    typeof count === 'string' &&
    typeof options === 'number'
  ) {
    indent = count
    count = options
  } else if (
    // isV3: indentString(input, count, indent)
    typeof count === 'number' &&
    typeof options === 'string'
  ) {
    indent = options
  } else if (options !== null && typeof options === 'object') {
    const opts = { __proto__: null, ...options }
    if (opts.includeEmptyLines !== undefined) {
      includeEmptyLines = opts.includeEmptyLines
    }
    if (opts.indent !== undefined) {
      indent = opts.indent
    }
  }
  if (typeof input !== 'string') {
    throw new TypeError(
      `Expected \`input\` to be a \`string\`, got \`${typeof input}\``,
    )
  }
  if (typeof count !== 'number') {
    throw new TypeError(
      `Expected \`count\` to be a \`number\`, got \`${typeof count}\``,
    )
  }
  if (count < 0) {
    throw new RangeError(
      `Expected \`count\` to be at least 0, got \`${count}\``,
    )
  }
  if (typeof indent !== 'string') {
    throw new TypeError(
      `Expected \`options.indent\` to be a \`string\`, got \`${typeof indent}\``,
    )
  }
  if (count === 0) {
    return input
  }
  const regex = includeEmptyLines ? /^/gm : /^(?!\s*$)/gm
  return input.replace(regex, indent.repeat(count))
}
