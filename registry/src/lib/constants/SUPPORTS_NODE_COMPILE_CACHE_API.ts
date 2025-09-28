import NODE_VERSION from './node-version'
import semver from '../../external/semver'

// https://nodejs.org/api/module.html#module-compile-cache
export default semver.satisfies(NODE_VERSION, '>=22.8.0')
