import browsersList from '../../external/browserslist'
import semver from '../../external/semver'
import { debugLogNs } from '../debug'

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ObjectFreeze = Object.freeze

// Under the hood browserlist uses the node-releases package which is out of date:
// https://github.com/chicoxyzzy/node-releases/issues/37
//
// So we maintain a manual version list for now.
// https://nodejs.org/en/about/previous-releases#looking-for-the-latest-release-of-a-version-branch
//
// Updated October 4th, 2025.
const manualNext = '24.9.0'
const manualCurr = '22.20.0'
const manualPrev = '20.19.5'
const manualLast = '18.20.8'

const query = browsersList('maintained node versions')
  // Trim value, e.g. 'node 22.15.0' to '22.15.0'.
  .map((s: string) => s.slice(5 /*'node '.length*/))

// browsersList returns results in descending order.
// Validate query length to ensure we have enough versions.
if (query.length < 4) {
  debugLogNs(
    'silly',
    `browsersList returned only ${query.length} versions, expected at least 4. Using manual fallbacks.`,
  )
}

const queryNext = query[0] ?? manualNext
const queryCurr = query[1] ?? manualCurr
const queryPrev = query[2] ?? manualPrev
// For last, use the actual last element to avoid off-by-one with negative indexing.
const queryLast = query.length >= 4 ? query[query.length - 1] : manualLast

const next = semver.gt(manualNext, queryNext) ? manualNext : queryNext

const current = semver.maxSatisfying(
  [queryCurr, manualCurr],
  `^${semver.major(queryCurr)}`,
)
const previous = semver.maxSatisfying(
  [queryPrev, manualPrev],
  `^${semver.major(queryPrev)}`,
)
const last = semver.lt(manualLast, queryLast) ? manualLast : queryLast

export default ObjectFreeze(
  Object.assign([last, previous, current, next], {
    last,
    previous,
    current,
    next,
  }),
)
