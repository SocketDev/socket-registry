declare interface InternalShared {
  isDateParseDaysOfMonthBuggy(parse: typeof Date.parse): boolean
}
declare const shared: InternalShared
export = shared
