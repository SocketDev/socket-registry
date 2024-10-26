'use strict'

const IteratorCtor = require('../Iterator/implementation')
const {
  IteratorCtor: IteratorCtorRaw,
  ObjectCreate,
  TypeErrorCtor,
  WrapForValidIteratorPrototype,
  getIteratorFlattenable,
  setIterated
} = require('../shared')

const IteratorFrom = IteratorCtorRaw?.from

// Based specification text:
// https://tc39.es/ecma262/#sec-iterator.from
module.exports =
  typeof IteratorFrom === 'function'
    ? IteratorFrom
    : function from(O) {
        // Built-in functions that are not identified as constructors do
        // not implement [[Construct]] unless otherwise specified.
        // https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects
        if (new.target) {
          throw new TypeErrorCtor('`Iterator.from` is not a constructor')
        }
        // Step 1: Let iteratorRecord be GetIteratorFlattenable(O, iterate-string-primitives).
        const { iterator, next } = getIteratorFlattenable(O, true)
        // Step 2: Let hasInstance be OrdinaryHasInstance(%Iterator%, iteratorRecord.[[Iterator]]).
        // Step 3: If hasInstance is true, then
        if (iterator instanceof IteratorCtor) {
          // Step 3.a: Return iteratorRecord.[[Iterator]].
          return iterator
        }
        // Step 4: Let wrapper be OrdinaryObjectCreate(%WrapForValidIteratorPrototype%, << [[Iterated]] >>).
        const wrapper = ObjectCreate(WrapForValidIteratorPrototype)
        // Step 5: Set wrapper.[[Iterated]] to iteratorRecord.
        setIterated(wrapper, { iterator, next })
        // Step 6: Return wrapper.
        return wrapper
      }
