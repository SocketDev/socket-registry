'use strict'

let _streamingIterables
/*@__NO_SIDE_EFFECTS__*/
function getStreamingIterables() {
  if (_streamingIterables === undefined) {
    _streamingIterables = /*@__PURE__*/ require('../external/streaming-iterables')
  }
  return _streamingIterables
}

/*@__NO_SIDE_EFFECTS__*/
function parallelMap(concurrency, func) {
  const streamingIterables = getStreamingIterables()
  return streamingIterables.parallelMap(concurrency, func)
}

module.exports = {
  parallelMap
}
