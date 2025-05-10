'use strict'

// Under the hood browserlist uses the node-releases package which is out of date:
// https://github.com/chicoxyzzy/node-releases/issues/37
//
// So we maintain a manual version list for now.
// https://nodejs.org/en/about/previous-releases#looking-for-the-latest-release-of-a-version-branch
//
// Updated May 10th, 2025.
const manualNext = '24.0.1'
const manualCurr = '22.15.0'
const manualPrev = '20.19.1'
const manualLast = '18.20.8'

const browsersList = /*@__PURE__*/ require('../../external/browserslist')
const query = browsersList('maintained node versions')
  // Trim value, e.g. 'node 22.15.0' to '22.15.0'.
  .map(s => s.slice(5 /*'node '.length*/))
// browsersList returns results in descending order.
const queryNext = query.at(0) ?? manualNext
const queryCurr = query.at(1) ?? manualCurr
const queryPrev = query.at(2) ?? manualPrev
const queryLast = query.at(-1) ?? manualLast

const semver = /*@__PURE__*/ require('../../external/semver')
const next = semver.gt(manualNext, queryNext) ? manualNext : queryNext

const current = semver.maxSatisfying(
  [queryCurr, manualCurr],
  `^${semver.major(queryCurr)}`
)
const previous = semver.maxSatisfying(
  [queryPrev, manualPrev],
  `^${semver.major(queryPrev)}`
)
const last = semver.lt(manualLast, queryLast) ? manualLast : queryLast

module.exports = Object.freeze(
  Object.assign([last, previous, current, next], {
    last,
    previous,
    current,
    next
  })
)
