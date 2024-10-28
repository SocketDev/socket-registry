'use strict'

const { isNaN: NumberIsNaN } = Number

module.exports =
  typeof NumberIsNaN === 'function'
    ? NumberIsNaN
    : function isNaN(value) {
        return typeof value === 'number' && value !== value
      }
