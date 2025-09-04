'use strict'

const SetCtor = Set

module.exports = function GetIntrinsic(name, _allowMissing) {
  return name === '%Set%' ? SetCtor : undefined
}
