/**
 * @fileoverview Boolean flag indicating Node.js compile cache API support.
 */

import semver from '../../external/semver'
import NODE_VERSION from './node-version'

// https://nodejs.org/api/module.html#module-compile-cache
export default semver.satisfies(NODE_VERSION, '>=22.8.0')
