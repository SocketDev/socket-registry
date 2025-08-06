'use strict'

const { freeze: ObjectFreeze, hasOwn: ObjectHasOwn } = Object

const { envAsBoolean, envAsString } = /*@__PURE__*/ require('../env')

const { env } = process

const DEBUG = envAsString(env.DEBUG)

module.exports = ObjectFreeze({
  __proto__: null,
  // CI is always set to 'true' in a GitHub action.
  // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
  // Libraries like yocto-colors check for CI not by value but my existence,
  // e.g. `'CI' in process.env`.
  CI: ObjectHasOwn(env, 'CI'),
  // Enable debug logging based on the 'debug' package.
  // https://socket.dev/npm/package/debug/overview/4.4.1
  DEBUG,
  // Set the debug log level (notice, error, warn, info, verbose, http, silly).
  LOG_LEVEL: envAsString(env.LOG_LEVEL),
  // .github/workflows/provenance.yml defines this.
  // https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-nodejs-packages
  NODE_AUTH_TOKEN: envAsString(env.NODE_AUTH_TOKEN),
  // NODE_ENV is a recognized convention, but not a built-in Node.js feature.
  NODE_ENV:
    envAsString(env.NODE_ENV).toLowerCase() === 'development'
      ? 'development'
      : 'production',
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
  // TAP=1 is set by the tap-run test runner.
  // https://node-tap.org/environment/#environment-variables-used-by-tap
  TAP: envAsBoolean(env.TAP),
  // VITEST=true is set by the Vitest test runner.
  // https://vitest.dev/config/#configuring-vitest
  VITEST: envAsBoolean(env.VITEST)
})
