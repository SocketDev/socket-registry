'use strict'

const impl = require('./implementation')
const { flagsGetter } = require('./shared')

module.exports = function getPolyfill() {
  let calls = ''
  flagsGetter.call({
    // eslint-disable-next-line getter-return
    get hasIndices() {
      calls += 'd'
    },
    // eslint-disable-next-line getter-return
    get sticky() {
      calls += 'y'
    }
  })
  return calls === 'dy' ? flagsGetter : impl
}
