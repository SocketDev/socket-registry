import NODE_VERSION from './node-version'
import semver from '../../external/semver'

// https://nodejs.org/api/cli.html#--permission
export default semver.satisfies(NODE_VERSION, '>=23.5.0||^22.13.0')
