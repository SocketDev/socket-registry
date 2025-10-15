/**
 * @fileoverview Default Node.js version range for packages.
 */

import semver from '../../external/semver'
import maintainedNodeVersions from './maintained-node-versions'

export default `>=${semver.parse(maintainedNodeVersions.last)?.major}`
