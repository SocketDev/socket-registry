/**
 * @fileoverview Boolean flag indicating Node.js compile cache environment variable support.
 */

import semver from '../../external/semver'
import NODE_VERSION from './node-version'

// https://nodejs.org/api/cli.html#node_compile_cachedir
export default semver.satisfies(NODE_VERSION, '>=22.1.0')
