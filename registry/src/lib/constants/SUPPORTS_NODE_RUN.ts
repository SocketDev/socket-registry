import NODE_VERSION from './node-version'
import semver from '../../external/semver'

// https://nodejs.org/api/all.html#all_cli_--run
export default semver.satisfies(NODE_VERSION, '>=22.3.0')
