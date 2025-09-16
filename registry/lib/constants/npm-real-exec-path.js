'use strict'

const npmExecPath = /*@__PURE__*/ require('./npm-exec-path')
const { resolveBinPathSync } = /*@__PURE__*/ require('../agent')

module.exports = resolveBinPathSync(npmExecPath)
