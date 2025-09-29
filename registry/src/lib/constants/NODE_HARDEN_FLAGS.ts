import WIN32 from './WIN32'

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ObjectFreeze = Object.freeze

export default ObjectFreeze(
  // Harden Node security.
  // https://nodejs.org/en/learn/getting-started/security-best-practices
  WIN32
    ? [
        // https://nodejs.org/api/cli.html#--disallow-code-generation-from-strings
        '--disallow-code-generation-from-strings',
      ]
    : [
        '--disallow-code-generation-from-strings',
        // https://nodejs.org/api/cli.html#--disable-protomode
        '--disable-proto',
        'throw',
        // https://nodejs.org/api/cli.html#--frozen-intrinsics
        // We have contributed the following patches to our dependencies to make
        // Node's --frozen-intrinsics workable.
        // √ https://github.com/SBoudrias/Inquirer.js/pull/1683
        // √ https://github.com/pnpm/components/pull/23
        '--frozen-intrinsics',
        // https://nodejs.org/api/cli.html#--no-deprecation
        '--no-deprecation',
      ],
)
