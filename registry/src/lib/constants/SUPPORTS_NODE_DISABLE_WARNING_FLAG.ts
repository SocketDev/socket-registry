import NODE_VERSION from './node-version'
import semver from '../../external/semver'

// https://nodejs.org/api/cli.html#--disable-warningcode-or-type
export default semver.satisfies(NODE_VERSION, '>=21.3.0||^20.11.0')
