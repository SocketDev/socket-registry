'use strict'

const { apply: ReflectApply } = Reflect
const { test: RegExpProtoTest } = RegExp.prototype

function regExpProtoTest(regex, str) {
  return ReflectApply(RegExpProtoTest, regex, [str])
}

module.exports = function callBoundIntrinsic(name, _allowMissing) {
  return name === 'RegExp.prototype.test' ? regExpProtoTest : undefined
}
