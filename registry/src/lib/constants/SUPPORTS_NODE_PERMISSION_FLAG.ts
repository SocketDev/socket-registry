/**
 * @fileoverview Boolean flag indicating Node.js permission flag support.
 */

import semver from '../../external/semver'
import NODE_VERSION from './node-version'

// https://nodejs.org/api/cli.html#--permission
export default semver.satisfies(NODE_VERSION, '>=23.5.0||^22.13.0')
