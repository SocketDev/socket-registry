'use strict'

function regExpProtoTest(regex, str) {
  return regex.test(str)
}

module.exports = function callBoundIntrinsic(name, _allowMissing) {
  return name === 'RegExp.prototype.test' ? regExpProtoTest : undefined
}
