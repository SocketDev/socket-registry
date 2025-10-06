import ENV from './ENV'

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ObjectFreeze = Object.freeze

export default ObjectFreeze(
  ENV.SOCKET_DEBUG ? ['--trace-uncaught', '--trace-warnings'] : [],
)
