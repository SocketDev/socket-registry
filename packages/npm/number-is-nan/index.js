'use strict'

const { isNaN: NumberIsNaN } = Number

module.exports =
  typeof NumberIsNaN === 'function'
    ? Number.isNaN
    : function isNaN(value) {
        return typeof value === 'number' && value !== value
      }
