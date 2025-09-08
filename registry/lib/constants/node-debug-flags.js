'use strict'

const { freeze: ObjectFreeze } = Object

const ENV = /*@__PURE__*/ require('./env')

module.exports = ObjectFreeze(
  ENV.SOCKET_CLI_DEBUG ? ['--trace-uncaught', '--trace-warnings'] : []
)
