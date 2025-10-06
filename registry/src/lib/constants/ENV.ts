import { envAsBoolean, envAsString } from '../env'
import WIN32 from './WIN32'

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ObjectFreeze = Object.freeze
const ObjectHasOwn = Object.hasOwn

const { env } = process
const loweredDebug = envAsString(env['DEBUG']).toLowerCase()

// Normalize DEBUG environment variable for debug package compatibility.
// - '1' or 'true' enables all debug namespaces (DEBUG='*').
// - '0' or 'false' disables all debug output (DEBUG='').
// - Any other value is used as-is for namespace filtering (e.g., 'app:*').
let DEBUG: string | undefined
if (loweredDebug === '1' || loweredDebug === 'true') {
  DEBUG = '*'
} else if (loweredDebug === '0' || loweredDebug === 'false') {
  DEBUG = ''
} else {
  DEBUG = loweredDebug
}

const HOME = envAsString(env['HOME'])
// TMPDIR (POSIX), TEMP (Windows), or TMP (fallback).
const TMPDIR = envAsString(env['TMPDIR'] || env['TEMP'] || env['TMP'])

export default ObjectFreeze({
  __proto__: null,
  // Windows-specific AppData folder for application data.
  APPDATA: envAsString(env['APPDATA']),
  // CI is always set to 'true' in a GitHub action.
  // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
  // Libraries like yocto-colors check for CI not by value but my existence,
  // e.g. `'CI' in process.env`.
  CI: ObjectHasOwn(env, 'CI'),
  // Terminal columns width.
  COLUMNS: envAsString(env['COLUMNS']),
  // Enable debug logging based on the 'debug' package.
  // https://socket.dev/npm/package/debug/overview/4.4.1
  DEBUG,
  // User home directory.
  HOME,
  // The absolute location of the %localappdata% folder on Windows used to store
  // user-specific, non-roaming application data, like temporary files, cached
  // data, and program settings, that are specific to the current machine and user.
  LOCALAPPDATA: envAsString(env['LOCALAPPDATA']),
  // Set the debug log level (notice, error, warn, info, verbose, http, silly).
  LOG_LEVEL: envAsString(env['LOG_LEVEL']),
  // .github/workflows/provenance.yml defines this.
  // https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-nodejs-packages
  NODE_AUTH_TOKEN: envAsString(env['NODE_AUTH_TOKEN']),
  // NODE_ENV is a recognized convention, but not a built-in Node.js feature.
  NODE_ENV:
    envAsString(env['NODE_ENV']).toLowerCase() === 'production'
      ? 'production'
      : 'development',
  // A space-separated list of command-line options. `options...` are interpreted
  // before command-line options, so command-line options will override or compound
  // after anything in `options...`. Node.js will exit with an error if an option
  // that is not allowed in the environment is used, such as `-p` or a script file.
  // https://nodejs.org/api/cli.html#node_optionsoptions
  NODE_OPTIONS: envAsString(env['NODE_OPTIONS']),
  // PRE_COMMIT is set to '1' by our 'test-pre-commit' script run by the
  // .husky/pre-commit hook.
  PRE_COMMIT: envAsBoolean(env['PRE_COMMIT']),
  // Override the default Socket cacache directory (~/.socket/_cacache).
  SOCKET_CACACHE_DIR: envAsString(env['SOCKET_CACACHE_DIR']),
  // Enable debug logging in Socket tools.
  SOCKET_DEBUG: !!DEBUG || envAsBoolean(env['SOCKET_DEBUG']),
  // Temporary directory path. TMPDIR (POSIX), TEMP (Windows), or TMP (fallback).
  TMPDIR,
  // Enable verbose build output.
  VERBOSE_BUILD: envAsBoolean(env['VERBOSE_BUILD']),
  // VITEST=true is set by the Vitest test runner.
  // https://vitest.dev/config/#configuring-vitest
  VITEST: envAsBoolean(env['VITEST']),
  // The location of the base directory on Linux and MacOS used to store
  // user-specific data files, defaulting to $HOME/.local/share if not set or empty.
  XDG_DATA_HOME: WIN32
    ? ''
    : envAsString(env['XDG_DATA_HOME']) || (HOME ? `${HOME}/.local/share` : ''),
})
