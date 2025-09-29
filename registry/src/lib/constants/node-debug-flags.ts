import ENV from './ENV'

const { freeze: ObjectFreeze } = Object

export default ObjectFreeze(
  ENV.SOCKET_CLI_DEBUG ? ['--trace-uncaught', '--trace-warnings'] : [],
)
