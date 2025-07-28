'use strict'

const npmExecPath = /*@__PURE__*/ require('./npm-exec-path')
const { resolveBinPathSync } = /*@__PURE__*/ require('../npm')

module.exports = resolveBinPathSync(npmExecPath)
