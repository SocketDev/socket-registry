import NODE_VERSION from './node-version'
import semver from '../../external/semver'

// https://nodejs.org/api/cli.html#node_compile_cachedir
export default semver.satisfies(NODE_VERSION, '>=22.1.0')
