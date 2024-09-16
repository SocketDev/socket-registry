'use strict'

const { parse: builtinParse } = Date
const { floor } = Math

// 15.9.1.15 Date Time String Format.
// https://tc39.es/ecma262/#sec-date-time-string-format
const yyyMmDdRegExp =
  /^(?<yyyy>\d{4}|[+-]\d{6})(?:-(?<mm>\d{2})(?:-(?<dd>\d{2}))?)?/
// const yyyMmDdRegExp = new RegExp('^'
//   + '(\\d{4}|[+-]\\d{6})' // four-digit year capture or sign + 6-digit expanded year
// 	 + '(?:-(\\d{2})' // optional month capture
// 	 + '(?:-(\\d{2})' // optional day capture
// 	 + ')?)?'
// )

// The cumulative day numbers for each month in a non-leap year.
// For example:
//   months[0] = 0: January starts at day 0.
//   months[1] = 31: February starts on day 31 (i.e., after January’s 31 days).
//   months[2] = 59: March starts on day 59 (31 days for January + 28 days for February).
// These are the day offsets for each month, assuming a non-leap year.
const months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]

// Calculates how many days have passed in a given year up to the specified month,
// taking leap years into account.
function dayFromMonth(year, month) {
  // t is set to 1 if the month is greater than 1 (i.e., March or later) and 0
  // if it’s January or February. This is done because leap years affect only
  // months after February. If you are calculating for March or later, you need
  // to check for leap years and adjust accordingly.
  const t = month > 1 ? 1 : 0
  // The formula accounting for leap years essentially sums up the number of
  // days contributed by:
  //   1.	The days from previous months in the same year (months[month]).
  //   2.	The number of days contributed by leap years and the correction for
  //      century years.
  //   3.	The total number of days from all complete years between 1970 and the
  //      specified year (365 * (year - 1970)).
  return (
    // Get the cumulative number of days for the given month.
    months[month] +
    // Count the number of leap years since 1970 (up to the specified year),
    // because every 4th year is a leap year. The value of t ensures the leap
    // year count is accurate if the month is March or later.
    floor((year - 1969 + t) / 4) -
    // Subtract the leap years that fall on century years (e.g. 1900, 2100),
    // which are not leap years unless divisible by 400.
    floor((year - 1901 + t) / 100) +
    // Add back the leap years for centuries that are divisible by 400 (e.g. 1600, 2000),
    // which are leap years.
    floor((year - 1601 + t) / 400) +
    // Account for the total number of days in all the non-leap years from 1970
    // up to the given year. Each year adds 365 days (ignoring leap years initially).
    365 * (year - 1970)
  )
}

module.exports = function parse(dateString) {
  // V8 (Chrome) and SpiderMonkey (Firefox) will parse dates like "2024-11-31"
  // even though the month of November only has 30 days.
  const match = yyyMmDdRegExp.exec(dateString)
  if (match) {
    const year = +match[1]
    const month = +(match[2] ?? 1) - 1
    const day = +(match[3] ?? 1) - 1
    const daysInTheMonth =
      dayFromMonth(year, month + 1) - dayFromMonth(year, month)
    if (day >= daysInTheMonth) {
      return NaN
    }
  }
  return builtinParse(dateString)
}
