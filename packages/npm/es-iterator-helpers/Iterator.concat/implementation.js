'use strict'

const {
  ArrayCtor,
  IteratorCtor,
  ReflectApply,
  SymbolIterator,
  TypeErrorCtor,
  createIteratorFromClosure,
  ensureObject,
  getIteratorDirect,
  getMethod,
  setUnderlyingIterator
} = require('../shared')

const IteratorConcat = IteratorCtor?.concat

// Based specification text:
// https://tc39.es/proposal-iterator-sequencing/
module.exports =
  typeof IteratorConcat === 'function'
    ? IteratorConcat
    : function concat(...iterables) {
        // ECMAScript Standard Built-in Objects
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        // Built-in function objects that are not identified as constructors do
        // not implement the [[Construct]] internal method unless otherwise
        // specified in the description of a particular function.
        if (new.target) {
          throw new TypeErrorCtor('`Iterator.concat` is not a constructor')
        }
        // Step 1: Let iterables be a new empty List.
        const { length } = iterables
        const records = ArrayCtor(length)
        // Step 2: For each element item of items (iterables), do
        for (let i = 0; i < length; i += 1) {
          const iterable = iterables[i]
          // Step 2.a: If item is not an Object, throw a TypeError exception.
          // Step 2.b: Let method be GetMethod(item, %Symbol.iterator%).
          // Step 2.c: If method is undefined, throw a TypeError exception.
          // (Handled by getMethod, which throws if method is missing or not callable.)
          records[i] = {
            iterable,
            openMethod: getMethod(iterable, SymbolIterator)
          }
        }
        let index = 0
        // Step 3: Let closure be a new Abstract Closure that captures iterables.
        const closure = {
          // This closure will perform the steps defined in Step 3.a.
          next() {
            const { length } = records
            while (index < length) {
              const { iterable, openMethod } = records[index]
              // Step 3.a.i: Let iter be Call(iterable.[[OpenMethod]], iterable.[[Iterable]]).
              const iterator = ReflectApply(openMethod, iterable, [])
              // Step 3.a.ii: If iter is not an Object, throw a TypeError exception.
              ensureObject(iterator)
              // Step 3.a.iii: Let iteratorRecord be GetIteratorDirect(iter).
              const { next } = getIteratorDirect(iterator)
              // Step 3.a.iv: Let innerAlive be true.
              // (Handled by the loop structure)
              // Step 3.a.v: Repeat, while innerAlive is true.
              const result = ReflectApply(next, iterator, [])
              if (!result.done) {
                // Step 3.a.v.3.a: Yield the value of the iterator.
                return result
              }
              // Step 3.a.v.2: If innerValue is done, move to the next iterable.
              index += 1
            }
            // Step 3.b: Return Completion(undefined).
            return { value: undefined, done: true }
          }
        }
        // Step 4: Create wrapper using CreateIteratorFromClosure.
        const wrapper = createIteratorFromClosure(closure)
        // Step 5: Set wrapper.[[UnderlyingIterator]] to iteratorRecord.
        setUnderlyingIterator(wrapper, closure)
        // Step 6: Return wrapper.
        return wrapper
      }
