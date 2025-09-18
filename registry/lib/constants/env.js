'use strict'

const { freeze: ObjectFreeze, hasOwn: ObjectHasOwn } = Object
const { env } = process

const { envAsBoolean, envAsString } = /*@__PURE__*/ require('../env')
const WIN32 = /*@__PURE__*/ require('./win32')

const DEBUG = envAsString(env.DEBUG)
const HOME = envAsString(env.HOME)

module.exports = ObjectFreeze({
  __proto__: null,
  // Windows-specific AppData folder for application data.
  APPDATA: envAsString(env.APPDATA),
  // CI is always set to 'true' in a GitHub action.
  // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
  // Libraries like yocto-colors check for CI not by value but my existence,
  // e.g. `'CI' in process.env`.
  CI: ObjectHasOwn(env, 'CI'),
  // Enable debug logging based on the 'debug' package.
  // https://socket.dev/npm/package/debug/overview/4.4.1
  DEBUG,
  // User home directory.
  HOME,
  // The absolute location of the %localappdata% folder on Windows used to store
  // user-specific, non-roaming application data, like temporary files, cached
  // data, and program settings, that are specific to the current machine and user.
  LOCALAPPDATA: envAsString(env.LOCALAPPDATA),
  // Set the debug log level (notice, error, warn, info, verbose, http, silly).
  LOG_LEVEL: envAsString(env.LOG_LEVEL),
  // .github/workflows/provenance.yml defines this.
  // https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-nodejs-packages
  NODE_AUTH_TOKEN: envAsString(env.NODE_AUTH_TOKEN),
  // NODE_ENV is a recognized convention, but not a built-in Node.js feature.
  NODE_ENV:
    envAsString(env.NODE_ENV).toLowerCase() === 'production'
      ? 'production'
      : 'development',
  // A space-separated list of command-line options. `options...` are interpreted
  // before command-line options, so command-line options will override or compound
  // after anything in `options...`. Node.js will exit with an error if an option
  // that is not allowed in the environment is used, such as `-p` or a script file.
  // https://nodejs.org/api/cli.html#node_optionsoptions
  NODE_OPTIONS: envAsString(env.NODE_OPTIONS),
  // PRE_COMMIT is set to '1' by our 'test-pre-commit' script run by the
  // .husky/pre-commit hook.
  PRE_COMMIT: envAsBoolean(env.PRE_COMMIT),
  // Enable debug logging in Socket CLI.
  SOCKET_CLI_DEBUG: !!DEBUG || envAsBoolean(env.SOCKET_CLI_DEBUG),
  // VITEST=true is set by the Vitest test runner.
  // https://vitest.dev/config/#configuring-vitest
  VITEST: envAsBoolean(env.VITEST),
  // The location of the base directory on Linux and MacOS used to store
  // user-specific data files, defaulting to $HOME/.local/share if not set or empty.
  XDG_DATA_HOME: WIN32
    ? ''
    : envAsString(env['XDG_DATA_HOME']) || (HOME ? `${HOME}/.local/share` : '')
})
