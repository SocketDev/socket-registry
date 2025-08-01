'use strict'

const { apply: ReflectApply } = Reflect

let _streamingIterables
/*@__NO_SIDE_EFFECTS__*/
function getStreamingIterables() {
  if (_streamingIterables === undefined) {
    _streamingIterables = /*@__PURE__*/ require('../external/streaming-iterables')
  }
  return _streamingIterables
}

/*@__NO_SIDE_EFFECTS__*/
async function parallelForEach(concurrency, func, iterable) {
  for await (const _ of parallelMap(concurrency, func, iterable)) {
    /* empty block */
  }
}

/*@__NO_SIDE_EFFECTS__*/
function parallelMap(...args) {
  const streamingIterables = getStreamingIterables()
  return ReflectApply(streamingIterables.parallelMap, undefined, args)
}

/*@__NO_SIDE_EFFECTS__*/
function transform(...args) {
  const streamingIterables = getStreamingIterables()
  return ReflectApply(streamingIterables.transform, undefined, args)
}

module.exports = {
  parallelForEach,
  parallelMap,
  transform
}
