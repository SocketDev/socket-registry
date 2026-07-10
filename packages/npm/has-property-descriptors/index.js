'use strict'

function hasArrayLengthDefineBug() {
  return false
}

function hasPropertyDescriptors() {
  return true
}

module.exports = hasPropertyDescriptors
module.exports.hasArrayLengthDefineBug = hasArrayLengthDefineBug
