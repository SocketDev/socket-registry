import ENV from './ENV.js'

const { freeze: ObjectFreeze } = Object

export default ObjectFreeze(
  ENV.SOCKET_CLI_DEBUG ? ['--trace-uncaught', '--trace-warnings'] : [],
)
