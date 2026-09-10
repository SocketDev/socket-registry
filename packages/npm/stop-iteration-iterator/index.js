'use strict'

const stopIteration =
  typeof globalThis.StopIteration === 'object' ? globalThis.StopIteration : null

const doneState = new WeakMap()

module.exports = function getStopIterationIterator(origIterator) {
  if (!stopIteration) {
    throw new SyntaxError('this environment lacks StopIteration')
  }
  doneState.set(origIterator, false)
  return {
    next() {
      const done = !!doneState.get(origIterator)
      try {
        // oxlint-disable-next-line socket/returned-object-null-proto -- IteratorResult requires an ordinary object.
        return {
          done,
          value: done ? undefined : origIterator.next(),
        }
      } catch (e) {
        doneState.set(origIterator, true)
        if (e !== stopIteration) {
          throw e
        }
        // oxlint-disable-next-line socket/returned-object-null-proto -- IteratorResult requires an ordinary object.
        return { done: true, value: undefined }
      }
    },
  }
}
