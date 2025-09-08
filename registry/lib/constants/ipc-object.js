'use strict'

const handler = /*@__PURE__*/ require('./ipc-handler')
const target = /*@__PURE__*/ require('./ipc-target')

module.exports = new Proxy(target, handler)
