'use strict'

function isDateParseDaysOfMonthBuggy(parse) {
  return isNaN(parse('2024-11-31'))
}

module.exports = {
  isDateParseDaysOfMonthBuggy
}
