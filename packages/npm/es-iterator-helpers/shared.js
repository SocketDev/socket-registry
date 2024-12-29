'use strict'

const ArrayCtor = Array
const ErrorCtor = Error
const { trunc: MathTrunc } = Math
const { isNaN: NumberIsNaN } = Number
const {
  create: ObjectCreate,
  defineProperty: ObjectDefineProperty,
  getOwnPropertyDescriptor: ObjectGetOwnPropertyDescriptor,
  hasOwn: ObjectHasOwn
} = Object
const {
  apply: ReflectApply,
  getPrototypeOf: ReflectGetPrototypeOf,
  ownKeys: ReflectOwnKeys
} = Reflect
const { iterator: SymbolIterator, toStringTag: SymbolToStringTag } = Symbol
const NumberCtor = Number
const TypeErrorCtor = TypeError
const RangeErrorCtor = RangeError

const SLOT = new WeakMap()

const SLOT_GENERATOR_CONTEXT = '[[GeneratorContext]]'
const SLOT_GENERATOR_STATE = '[[GeneratorState]]'
const SLOT_ITERATED = '[[Iterated]]'
const SLOT_UNDERLYING_ITERATOR = '[[UnderlyingIterator]]'

const GENERATOR_STATE_COMPLETED = 'completed'
const GENERATOR_STATE_SUSPENDED_STARTED = 'suspended-start'

const ArrayIteratorPrototype = ReflectGetPrototypeOf([][SymbolIterator]())
const { Iterator: IteratorCtor } = globalThis
const IteratorPrototype = ReflectGetPrototypeOf(ArrayIteratorPrototype)

;('use strict')

// Based on https://tc39.es/ecma262/#sec-%iteratorhelperprototype%-object.
const IteratorHelperPrototype = ObjectCreate(IteratorPrototype, {
  next: {
    __proto__: null,
    configurable: true,
    enumerable: false,
    value: (function () {
      const processedContexts = new Set() // Track processed generator contexts.

      return function next() {
        const generator = getSlot(this, SLOT_GENERATOR_CONTEXT)
        const generatorNext = generator?.next
        if (typeof generatorNext !== 'function') {
          throw new TypeErrorCtor('Generator context not set or invalid')
        }

        const underlyingIterator = getSlot(this, SLOT_UNDERLYING_ITERATOR)
        const underlyingNext = underlyingIterator?.next
        if (typeof underlyingNext !== 'function') {
          throw new TypeErrorCtor('Underlying iterator not set or invalid')
        }

        if (getSlot(this, SLOT_GENERATOR_STATE) === GENERATOR_STATE_COMPLETED) {
          return { value: undefined, done: true }
        }

        // Avoid reprocessing the same generator context.
        if (processedContexts.has(generator)) {
          throw new TypeErrorCtor('Recursive generator context detected')
        }

        processedContexts.add(generator) // Mark this generator context as processed.

        try {
          // Execute the closure's next function to apply transformations (like map).
          const nextValue = ReflectApply(generatorNext, generator, [])
          if (nextValue.done) {
            setSlot(this, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
          }
          return nextValue
        } catch (error) {
          setSlot(this, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
          throw error
        } finally {
          // Clean up the context after processing.
          processedContexts.delete(generator)
        }
      }
    })(),
    writable: true
  },
  return: {
    __proto__: null,
    configurable: true,
    enumerable: false,
    value: function () {
      const underlyingIterator = getSlot(this, SLOT_UNDERLYING_ITERATOR)
      if (!isObjectType(underlyingIterator)) {
        throw new TypeErrorCtor('Iterator must be an Object')
      }

      const generatorState = getSlot(this, SLOT_GENERATOR_STATE)
      if (generatorState === GENERATOR_STATE_COMPLETED) {
        return { value: undefined, done: true }
      }

      try {
        const returnMethod = getMethod(underlyingIterator, 'return')
        if (returnMethod === undefined) {
          setSlot(this, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
          return { value: undefined, done: true }
        }

        // Ensure the iterator completes after return
        const result = ReflectApply(returnMethod, underlyingIterator, [])
        setSlot(this, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
        return result
      } catch (error) {
        setSlot(this, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
        throw error
      }
    },
    writable: true
  },
  [SymbolToStringTag]: {
    configurable: true,
    enumerable: false,
    value: 'Iterator Helper',
    writable: false
  }
})

// Based on https://tc39.es/ecma262/#sec-%wrapforvaliditeratorprototype%-object.
const WrapForValidIteratorPrototype = ObjectCreate(IteratorPrototype, {
  // Based on https://tc39.es/ecma262/#sec-%wrapforvaliditeratorprototype%.next.
  next: {
    __proto__: null,
    configurable: true,
    enumerable: false,
    value: function next() {
      // Step 1: Let O be this value.
      const O = this
      // Step 2: Perform RequireInternalSlot(O, [[Iterated]]).
      ensureObject(O)
      const slots = SLOT.get(O)
      if (!(slots && ObjectHasOwn(slots, SLOT_ITERATED))) {
        throw new TypeError(`"${SLOT_ITERATED}" is not present on "O"`)
      }
      // Step 3: Let iteratorRecord be O.[[Iterated]].
      const { iterator, next } = slots[SLOT_ITERATED]
      // Step 4: Return Call(iteratorRecord.[[NextMethod]], iteratorRecord.[[Iterator]]).
      return ReflectApply(next, iterator, [])
    },
    writable: true
  },
  // Based on https://tc39.es/ecma262/#sec-%wrapforvaliditeratorprototype%.return.
  return: {
    __proto__: null,
    configurable: true,
    enumerable: false,
    value: function () {
      // Step 1: Let O be this value.
      const O = this
      // Step 2: Perform RequireInternalSlot(O, [[Iterated]]).
      ensureObject(O)
      const slots = SLOT.get(O)
      if (!(slots && ObjectHasOwn(slots, SLOT_ITERATED))) {
        throw new TypeError(`"${SLOT_ITERATED}" is not present on "O"`)
      }
      // Step 3: Let iterator be O.[[Iterated]].[[Iterator]].
      const { iterator } = slots[SLOT_ITERATED]
      // Step 4: Assert: iterator is an Object.
      ensureObject(iterator, 'iterator')
      // Step 5: Let returnMethod be GetMethod(iterator, "return").
      const returnMethod = getMethod(iterator, 'return')
      // Step 6: If returnMethod is undefined, then
      if (returnMethod === undefined) {
        // Step 6.a: Return CreateIteratorResultObject(undefined, true).
        return { value: undefined, done: true }
      }
      // Step 7: Return Call(returnMethod, iterator).
      return ReflectApply(returnMethod, iterator, [])
    },
    writable: true
  }
})

// Based on https://tc39.es/ecma262/#sec-createiteratorfromclosure.
function createIteratorFromClosure(closure) {
  if (!closure || typeof closure.next !== 'function') {
    throw new TypeErrorCtor('Closure must have a `next` method')
  }
  const generator = ObjectCreate(IteratorHelperPrototype)
  SLOT.set(generator, {
    __proto__: null,
    [SLOT_GENERATOR_CONTEXT]: closure,
    [SLOT_GENERATOR_STATE]: GENERATOR_STATE_SUSPENDED_STARTED,
    [SLOT_UNDERLYING_ITERATOR]: undefined
  })
  return generator
}

function ensureObject(thisArg, what = 'this') {
  if (!isObjectType(thisArg)) {
    throw new TypeErrorCtor(`\`${what}\` value must be an Object`)
  }
}

// Based on https://tc39.es/ecma262/#sec-getiterator.
function getIterator(obj) {
  const method = obj[SymbolIterator]
  if (typeof method !== 'function') {
    throw new TypeErrorCtor('Object is not iterable')
  }
  return ReflectApply(method, obj, [])
}

// Based on https://tc39.es/ecma262/#sec-getiteratordirect.
function getIteratorDirect(obj) {
  return { next: obj.next, iterator: obj, done: false }
}

// Based on https://tc39.es/ecma262/#sec-getiteratorflattenable.
function getIteratorFlattenable(obj, allowStrings) {
  // Step 1: If obj is not an Object
  if (!isObjectType(obj) && !(allowStrings && typeof obj === 'string')) {
    // Step 1.a: If primitiveHandling is reject-primitives, throw a TypeError
    throw new TypeErrorCtor('Primitives are not iterable')
  }
  // Step 2: Let method be GetMethod(obj, %Symbol.iterator%)
  const method = getMethod(obj, SymbolIterator)
  // Step 3: If method is undefined, set iterator to obj itself
  const iterator = method
    ? // Step 4: Call method with obj
      ReflectApply(method, obj, [])
    : obj
  // Step 5: If iterator is not an Object, throw a TypeError
  ensureObject(iterator, 'iterator')
  // Step 6: Return GetIteratorDirect(iterator)
  return getIteratorDirect(iterator)
}

// Based on https://tc39.es/ecma262/#sec-getmethod.
function getMethod(obj, key) {
  const method = obj[key]
  if (method === undefined || method === null) {
    return undefined
  }
  if (typeof method !== 'function') {
    throw new TypeErrorCtor('Method is not a function')
  }
  return method
}

// Based on https://tc39.es/proposal-joint-iteration/#sec-getoptionsobject.
function getOptionsObject(options) {
  // Step 1: If options is undefined, return OrdinaryObjectCreate(null).
  if (options === undefined) {
    return { __proto__: null }
  }
  // Step 2: If Type(options) is not Object, throw a TypeError exception.
  if (!isObjectType(options)) {
    throw new TypeErrorCtor('Options must be an object or undefined')
  }
  // Step 3: Return options.
  return options
}

function getSlot(O, slot) {
  const slots = resolveSlots(O, slot)
  return slots[slot]
}

// Based on https://tc39.es/ecma262/#sec-ifabruptcloseiterator.
function ifAbruptCloseIterator(iterator, error) {
  if (error) {
    try {
      const returnMethod = getMethod(iterator, 'return')
      if (returnMethod) {
        ReflectApply(returnMethod, iterator, [])
      }
    } catch {
      // If both `predicate` and `return()` throw, the `predicate`'s error
      // should win.
    }
    throw error
  }
}

function isIteratorProtoNextCheckBuggy(method, arg) {
  if (typeof method === 'function') {
    // https://issues.chromium.org/issues/336839115
    try {
      ReflectApply(method, { next: null }, [arg]).next()
      return true
    } catch {}
  }
  return false
}

// Based on https://tc39.es/ecma262/#sec-object-type.
function isObjectType(value) {
  return (
    typeof value === 'function' || (value !== null && typeof value === 'object')
  )
}

// Based on https://tc39.es/ecma262/#sec-iteratorclose.
function iteratorClose(iterator, completion) {
  const returnMethod = getMethod(iterator, 'return')
  if (returnMethod === undefined) {
    return completion
  }
  const innerResult = ReflectApply(returnMethod, iterator, [])
  if (!isObjectType(innerResult)) {
    throw new TypeError('`Iterator.return` result must be an object')
  }
  return completion
}

// Based on https://tc39.es/proposal-joint-iteration/#sec-closeall.
function iteratorCloseAll(openIters, error) {
  for (const iter of openIters) {
    if (iter !== null && typeof iter.return === 'function') {
      try {
        iter.return()
      } catch {
        // Ignore errors during iterator closure.
      }
    }
  }
  if (error) {
    throw error
  }
}

// Based on https://tc39.es/proposal-joint-iteration/#sec-IteratorZip.
function iteratorZip(iters, mode, padding, finishResults = v => v) {
  const iterCount = iters.length // Step 1: Number of iterators.
  const openIters = [...iters] // Step 2: Copy of iterators to track active ones.

  // Step 3: Define the generator closure.
  const generator = {
    next() {
      // Step 3.a: If iterCount = 0, return { value: undefined, done: true }.
      if (iterCount === 0) {
        return { value: undefined, done: true }
      }

      const results = [] // Step 3.b.i: Let results be a new empty list.

      // Step 3.b.ii: Assert: openIters is not empty.
      if (openIters.every(iter => iter === null)) {
        return { value: undefined, done: true }
      }

      // Step 3.b.iii: Iterate through openIters.
      for (let i = 0; i < iterCount; i += 1) {
        const iter = openIters[i]

        // Step 3.b.iii.2: If iter is null...
        if (iter === null) {
          // Assert: mode is "longest".
          if (mode !== 'longest') {
            throw new ErrorCtor(
              'Invalid state: null iterator in non-longest mode'
            )
          }
          results.push(padding[i]) // Use padding for exhausted iterators.
          continue
        }

        try {
          // Step 3.b.iii.3.a: Fetch the next value from the iterator.
          const next = ReflectApply(iter.next, iter.iterator, [])

          // Step 3.b.iii.3.d: If next is done...
          if (next.done) {
            openIters[i] = null // Mark iterator as exhausted.

            if (mode === 'shortest') {
              // Stop iteration in shortest mode as soon as one iterator is exhausted.
              return { value: undefined, done: true }
            }

            results.push(padding[i]) // Add padding for exhausted iterators in longest mode.
          } else {
            results.push(next.value) // Add the value to the results list.
          }
        } catch (err) {
          // Step 3.b.iii.3.b: Handle abrupt completions.
          openIters[i] = null // Mark iterator as exhausted.
          return iteratorCloseAll(openIters, err) // Close all iterators and propagate the error.
        }
      }

      // Step 3.b.iv: Finalize the results using finishResults.
      const finalizedResults = finishResults(results)

      // Step 3.b.v: Yield the finalized results.
      return { value: finalizedResults, done: false }
    },

    return() {
      // Close all iterators when the zip iterator is terminated.
      iteratorCloseAll(openIters)
      return { value: undefined, done: true }
    },

    [Symbol.iterator]() {
      return this
    }
  }

  // Step 5: Attach the underlying iterators to the generator.
  generator[Symbol.for('[[UnderlyingIterators]]')] = openIters

  // Step 6: Return the generator.
  return generator
}

function resolveSlots(O, slot) {
  if (!SLOT.has(O)) {
    throw new TypeErrorCtor('Object is not properly initialized')
  }
  const slots = SLOT.get(O)
  if (!slots || !(slot in slots)) {
    throw new TypeErrorCtor(`Missing slot: ${slot}`)
  }
  return slots
}

function setIterated(wrapper, record) {
  setSlot(wrapper, SLOT_ITERATED, record)
}

function setSlot(O, slot, value) {
  let slots = SLOT.get(O)
  if (slots == undefined) {
    slots = {
      __proto__: null,
      [SLOT_GENERATOR_CONTEXT]: undefined,
      [SLOT_GENERATOR_STATE]: GENERATOR_STATE_SUSPENDED_STARTED,
      [SLOT_UNDERLYING_ITERATOR]: undefined
    }
    SLOT.set(O, slots)
  }
  slots[slot] = value
}

function setUnderlyingIterator(generator, iterator) {
  setSlot(generator, SLOT_UNDERLYING_ITERATOR, iterator)
}

// Based on https://tc39.es/ecma262/#sec-tointegerorinfinity.
function toIntegerOrInfinity(value) {
  // Step 1: Let number be ? ToNumber(argument).
  const num = NumberCtor(value)
  // Step 2: If number is one of NaN, +0, or -0, return 0.
  if (num === 0 || NumberIsNaN(num)) {
    return 0
  }
  // Step 3: If number is +Infinity, return +Infinity.
  // Step 4: If number is -Infinity, return -Infinity.
  if (num === Infinity || num === -Infinity) {
    return num
  }
  // Step 5: Return truncate(number).
  return MathTrunc(num)
}

module.exports = {
  ArrayCtor,
  IteratorCtor,
  IteratorPrototype,
  NumberCtor,
  NumberIsNaN,
  ObjectCreate,
  ObjectDefineProperty,
  ObjectGetOwnPropertyDescriptor,
  RangeErrorCtor,
  ReflectApply,
  ReflectGetPrototypeOf,
  ReflectOwnKeys,
  SymbolIterator,
  TypeErrorCtor,
  WrapForValidIteratorPrototype,
  ifAbruptCloseIterator,
  iteratorClose,
  iteratorZip,
  createIteratorFromClosure,
  ensureObject,
  getIterator,
  getIteratorDirect,
  getIteratorFlattenable,
  getMethod,
  getOptionsObject,
  isIteratorProtoNextCheckBuggy,
  setIterated,
  setUnderlyingIterator,
  toIntegerOrInfinity
}
