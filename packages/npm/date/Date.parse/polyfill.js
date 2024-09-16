'use strict'

const impl = require('./implementation')

module.exports = function getPolyfill() {
  // V8 (Chrome) and SpiderMonkey (Firefox) will parse dates like "2024-11-31"
  // even though the month of November only has 30 days. This is technically
  // allowed by https://tc39.es/ecma262/#sec-date.parse:
  // > If the String does not conform to that format the function may fall back
  // > to any implementation-specific heuristics or implementation-specific date
  // > formats. Strings that are unrecognizable or contain out-of-bounds format
  // > element values shall cause this function to return NaN.
  //
  // However, we've opted to normalize it for cross-platform consistency.
  return isNaN(Date.parse('2024-11-31')) ? Date.parse : impl
}
