'use strict'

const {
  normalizeIterationOptions,
  pRetry
} = /*@__PURE__*/ require('./promises')

let _streamingIterables
/*@__NO_SIDE_EFFECTS__*/
function getStreamingIterables() {
  if (_streamingIterables === undefined) {
    _streamingIterables = /*@__PURE__*/ require('../external/streaming-iterables')
  }
  return _streamingIterables
}

/*@__NO_SIDE_EFFECTS__*/
async function parallelEach(iterable, func, options) {
  for await (const _ of parallelMap(iterable, func, options)) {
    /* empty block */
  }
}

/*@__NO_SIDE_EFFECTS__*/
function parallelMap(iterable, func, options) {
  const streamingIterables = getStreamingIterables()
  const opts = normalizeIterationOptions(options)
  return streamingIterables.parallelMap(
    opts.concurrency,
    item =>
      pRetry(func, {
        ...opts.retries,
        args: [item]
      }),
    iterable
  )
}

/*@__NO_SIDE_EFFECTS__*/
function transform(iterable, func, options) {
  const streamingIterables = getStreamingIterables()
  const opts = normalizeIterationOptions(options)
  return streamingIterables.transform(
    opts.concurrency,
    item =>
      pRetry(func, {
        ...opts.retries,
        args: [item]
      }),
    iterable
  )
}

module.exports = {
  parallelEach,
  parallelMap,
  transform
}
