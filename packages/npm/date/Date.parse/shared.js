'use strict'

function isDateParseDaysOfMonthBuggy(parse) {
  return Number.isNaN(parse('2024-11-31'))
}

module.exports = {
  isDateParseDaysOfMonthBuggy,
}
