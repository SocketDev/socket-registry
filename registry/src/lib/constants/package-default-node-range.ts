/**
 * @fileoverview Default Node.js version range for packages.
 */

import maintainedNodeVersions from './maintained-node-versions'
import semver from '../../external/semver'

export default `>=${semver.parse(maintainedNodeVersions.last)?.major}`
