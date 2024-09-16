'use strict'

module.exports =
  Number.isNaN ??
  function isNaN(value) {
    return typeof value === 'number' && value !== value
  }
