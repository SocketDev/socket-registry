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

// Based on https://tc39.es/proposal-iterator-sequencing/#sec-iterator.concat.
module.exports =
  typeof IteratorConcat === 'function'
    ? IteratorConcat
    : function concat(...iterables) {
        // Built-in functions that are not identified as constructors do
        // not implement [[Construct]] unless otherwise specified.
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        if (new.target) {
          throw new TypeErrorCtor('`Iterator.concat` is not a constructor')
        }
        // Step 1: Let iterables be a new empty List.
        const { length } = iterables
        const records = ArrayCtor(length)
        // Step 2: For each element item of items, do.
        for (let i = 0; i < length; i += 1) {
          const iterable = iterables[i]
          // Step 2.a: If item is not an Object, throw a TypeError exception.
          ensureObject(iterable, 'iterable')
          // Step 2.b: Let method be ? GetMethod(item, %Symbol.iterator%).
          const method = getMethod(iterable, SymbolIterator)
          // Step 2.c: If method is undefined, throw a TypeError exception.
          if (method === undefined) {
            throw new TypeErrorCtor(
              '`Iterator.concat` requires all arguments to be iterable'
            )
          }
          // Step 2.d: Append the Record { [[OpenMethod]]: method, [[Iterable]]: item } to iterables.
          records[i] = { iterable, openMethod: method }
        }

        // Step 3: Let closure be a new Abstract Closure with no parameters that captures iterables and performs the following steps when called.
        let iterablesIndex = 0
        let innerIteratorRecord
        const closure = {
          next() {
            // Step 3.a: For each Record iterable of iterables, do.
            while (iterablesIndex < length) {
              // Step 3.a.i: Let iter be ? Call(iterable.[[OpenMethod]], iterable.[[Iterable]]).
              if (innerIteratorRecord === undefined) {
                const { iterable, openMethod } = records[iterablesIndex]
                const innerIterator = ReflectApply(openMethod, iterable, [])
                // Step 3.a.ii: If iter is not an Object, throw a TypeError exception.
                ensureObject(innerIterator, 'iterator')
                // Step 3.a.iii: Let iteratorRecord be ? GetIteratorDirect(iter).
                innerIteratorRecord = getIteratorDirect(innerIterator)
              }
              const { iterator, next } = innerIteratorRecord
              try {
                // Step 3.a.v.1: Let iteratorResult be ? IteratorStep(iteratorRecord).
                const result = ReflectApply(next, iterator, [])
                // Step 3.a.v.3: Yield value if not done.
                if (!result.done) {
                  return { value: result.value, done: false }
                }
              } catch (error) {
                // Step 3.a.v.3.b.i: Handle abrupt completion and rethrow error.
                innerIteratorRecord = undefined
                iterablesIndex += 1
                throw error
              }
              // Step 3.a.v.2: Set innerAlive to false and move to the next iterable.
              innerIteratorRecord = undefined
              iterablesIndex += 1
            }
            // Step 3.b: Return Completion(undefined).
            return { value: undefined, done: true }
          },

          return() {
            // Handle iterator return if it exists.
            if (innerIteratorRecord) {
              const { iterator } = innerIteratorRecord
              innerIteratorRecord = undefined
              const returnMethod = getMethod(iterator, 'return')
              if (typeof returnMethod === 'function') {
                return ReflectApply(returnMethod, iterator, [])
              }
            }
            return { value: undefined, done: true }
          },

          throw(error) {
            // Handle iterator throw if it exists.
            if (innerIteratorRecord) {
              const { iterator } = innerIteratorRecord
              innerIteratorRecord = undefined
              const throwMethod = getMethod(iterator, 'throw')
              if (typeof throwMethod === 'function') {
                return ReflectApply(throwMethod, iterator, [error])
              }
            }
            // Skip remaining iterables and propagate the error.
            iterablesIndex = length
            throw error
          }
        }

        // Step 4: Let gen be CreateIteratorFromClosure(closure, "Iterator Helper", %IteratorHelperPrototype%, « [[UnderlyingIterators]] »).
        const wrapper = createIteratorFromClosure(closure)
        // Step 5: Set gen.[[UnderlyingIterators]] to a new empty List.
        setUnderlyingIterator(wrapper, closure)
        // Step 6: Return gen.
        return wrapper
      }
