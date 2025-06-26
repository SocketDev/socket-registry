'use strict'

const { resolveBinPathSync } = /*@__PURE__*/ require('../npm')
const which = /*@__PURE__*/ require('../../external/which')

module.exports = resolveBinPathSync(which.sync('npm'))
