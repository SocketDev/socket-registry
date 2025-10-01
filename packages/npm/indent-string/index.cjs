'use strict'

module.exports = function indentString(input, count = 1, options) {
  const { includeEmptyLines = false, indent = ' ' } = {
    __proto__: null,
    ...options,
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
