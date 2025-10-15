/**
 * @fileoverview Boolean flag indicating Node.js disable warning flag support.
 */

import semver from '../../external/semver'
import NODE_VERSION from './node-version'

// https://nodejs.org/api/cli.html#--disable-warningcode-or-type
export default semver.satisfies(NODE_VERSION, '>=21.3.0||^20.11.0')
