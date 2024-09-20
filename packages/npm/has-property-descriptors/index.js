'use strict'

function hasPropertyDescriptors() {
  return true
}

function hasArrayLengthDefineBug() {
  return false
}

module.exports = hasPropertyDescriptors
module.exports.hasArrayLengthDefineBug = hasArrayLengthDefineBug
