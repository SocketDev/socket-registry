'use strict'

// Under the hood browserlist uses the node-releases package which is out of date:
// https://github.com/chicoxyzzy/node-releases/issues/37
//
// So we maintain a manual version list for now.
// https://nodejs.org/en/about/previous-releases#looking-for-latest-release-of-a-version-branch
//
// Updated March 5th, 2025.
const manualNext = '23.9.0'
const manualCurr = '22.14.0'
const manualPrev = '20.18.3'
const manualLast = '18.20.7'

const browsersList = /*@__PURE__*/ require('browserslist')
const semver = /*@__PURE__*/ require('semver')

const query = browsersList('maintained node versions')
  // Trim value, e.g. 'node 22.5.0' to '22.5.0'.
  .map(s => s.slice(5 /*'node '.length*/))
// browsersList returns results in descending order.
const queryNext = query.at(0) ?? manualNext
const queryCurr = query.at(1) ?? manualCurr
const queryPrev = query.at(2) ?? manualPrev
const queryLast = query.at(-1) ?? manualLast

const next = semver.maxSatisfying(
  [queryNext, manualNext],
  `^${semver.major(queryNext)}`
)
const current = semver.maxSatisfying(
  [queryCurr, manualCurr],
  `^${semver.major(queryCurr)}`
)
const previous = semver.maxSatisfying(
  [queryPrev, manualPrev],
  `^${semver.major(queryPrev)}`
)
const last = semver.maxSatisfying(
  [queryLast, manualLast],
  `^${semver.major(queryLast)}`
)

module.exports = Object.freeze(
  Object.assign([last, previous, current, next], {
    last,
    previous,
    current,
    next
  })
)
