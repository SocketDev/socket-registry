'use strict'

function isRegExpProtoFlagsOrderBuggy(flagsGetter) {
  let calls = ''
  flagsGetter.call({
    // biome-ignore lint/suspicious/useGetterReturn: Testing getter call order without return.
    get hasIndices() {
      calls += 'd'
    },

    // biome-ignore lint/suspicious/useGetterReturn: Testing getter call order without return.
    get sticky() {
      calls += 'y'
    },
  })
  return calls !== 'dy'
}

module.exports = {
  isRegExpProtoFlagsOrderBuggy,
}
