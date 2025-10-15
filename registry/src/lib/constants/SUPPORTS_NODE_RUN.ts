/**
 * @fileoverview Boolean flag indicating Node.js run command support.
 */

import semver from '../../external/semver'
import NODE_VERSION from './node-version'

// https://nodejs.org/api/all.html#all_cli_--run
export default semver.satisfies(NODE_VERSION, '>=22.3.0')
