'use strict'

const ArrayCtor = Array
const ErrorCtor = Error
const { trunc: MathTrunc } = Math
const { isNaN: NumberIsNaN } = Number
const {
  create: ObjectCreate,
  defineProperty: ObjectDefineProperty,
  getOwnPropertyDescriptor: ObjectGetOwnPropertyDescriptor,
  hasOwn: ObjectHasOwn,
} = Object
const {
  apply: ReflectApply,
  getPrototypeOf: ReflectGetPrototypeOf,
  ownKeys: ReflectOwnKeys,
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

const processedContexts = new Set()

// Based on https://tc39.es/ecma262/#sec-%iteratorhelperprototype%-object.
const IteratorHelperPrototype = ObjectCreate(IteratorPrototype, {
  next: {
    __proto__: null,
    configurable: true,
    enumerable: false,
    // Based on https://tc39.es/ecma262/#sec-%iteratorhelperprototype%.next
    // Step 1: Return ? GeneratorResume(this value, undefined, "Iterator Helper").
    value: function next() {
      // Based on https://tc39.es/ecma262/#sec-generatorresume
      // Step 1: Let state be ? GeneratorValidate(generator, generatorBrand).
      const O = this
      const generator = getSlot(O, SLOT_GENERATOR_CONTEXT)
      const generatorNext = generator?.next
      if (typeof generatorNext !== 'function') {
        throw new TypeErrorCtor('Generator context not set or invalid')
      }
      // Retrieve the underlying iterator for later use.
      const underlyingIterator = getSlot(O, SLOT_UNDERLYING_ITERATOR)
      const underlyingNext = underlyingIterator?.next
      if (typeof underlyingNext !== 'function') {
        throw new TypeErrorCtor('Underlying iterator not set or invalid')
      }
      // Step 2: If state is completed, return CreateIteratorResultObject(undefined, true).
      if (getSlot(O, SLOT_GENERATOR_STATE) === GENERATOR_STATE_COMPLETED) {
        return { value: undefined, done: true }
      }
      // Step 3: Assert: state is either suspended-start or suspended-yield.
      if (processedContexts.has(generator)) {
        throw new TypeErrorCtor('Recursive generator context detected')
      }
      processedContexts.add(generator)
      try {
        // Step 4: Let genContext be generator.[[GeneratorContext]].
        // Step 5: Let methodContext be the running execution context.
        // Step 6: Suspend methodContext.
        // Step 7: Set generator.[[GeneratorState]] to executing.
        // Step 8: Push genContext onto the execution context stack; genContext
        // is now the running execution context.
        // Step 9: Resume the suspended evaluation of genContext using NormalCompletion(value).
        // Step 10: Assert: When we return here, genContext has already been
        // removed from the execution context stack.
        const nextValue = ReflectApply(generatorNext, generator, [])
        if (nextValue.done) {
          setSlot(this, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
        }
        // Step 11: Return ? result.
        return nextValue
      } catch (error) {
        setSlot(this, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
        throw error
      } finally {
        // Clean up the context after processing.
        processedContexts.delete(generator)
      }
    },
    writable: true,
  },
  return: {
    __proto__: null,
    configurable: true,
    enumerable: false,
    // Based on https://tc39.es/ecma262/#sec-%iteratorhelperprototype%.return.
    value: function () {
      // Step 1: Bind `this` to O.
      const O = this
      // Step 2: Ensure O has the [[UnderlyingIterator]] internal slot.
      const underlyingIterator = getSlot(O, SLOT_UNDERLYING_ITERATOR)
      if (!isObjectType(underlyingIterator)) {
        throw new TypeErrorCtor('Iterator must be an Object')
      }
      // Step 3: Ensure O has a [[GeneratorState]] internal slot.
      const generatorState = getSlot(O, SLOT_GENERATOR_STATE)

      // Step 4: If the generator is suspended-start, mark it as completed and
      // return a completed result.
      if (generatorState === GENERATOR_STATE_COMPLETED) {
        return { value: undefined, done: true }
      }
      try {
        // Step 4.c: Close the underlying iterator and complete the generator.
        iteratorClose(underlyingIterator, undefined)
        setSlot(O, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
        return { value: undefined, done: true }
      } catch (error) {
        // Step 6: If an abrupt completion occurs, set the generator to completed
        // and propagate the error.
        setSlot(O, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
        throw error
      }
    },
    writable: true,
  },
  // Based on https://tc39.es/ecma262/#sec-%iteratorhelperprototype%-%symbol.tostringtag%.
  [SymbolToStringTag]: {
    configurable: true,
    enumerable: false,
    value: 'Iterator Helper',
    writable: false,
  },
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
      const { iterator, next: nextMethod } = slots[SLOT_ITERATED]
      // Step 4: Return Call(iteratorRecord.[[NextMethod]], iteratorRecord.[[Iterator]]).
      return ReflectApply(nextMethod, iterator, [])
    },
    writable: true,
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
    writable: true,
  },
})

// Based on https://tc39.es/ecma262/#sec-createiteratorfromclosure.
function createIteratorFromClosure(closure) {
  // Step 1: NOTE: closure can contain uses of the Yield operation to yield an
  // IteratorResult object.
  // Step 2: If extraSlots is not present, set extraSlots to a new empty List.
  // Step 3: Let internalSlotsList be the list-concatenation of extraSlots and
  // << [[GeneratorState]], [[GeneratorContext]], [[GeneratorBrand]] >>.
  // Step 4: Let generator be OrdinaryObjectCreate(generatorPrototype, internalSlotsList).
  const generator = ObjectCreate(IteratorHelperPrototype)
  // Step 5: Set generator.[[GeneratorBrand]] to generatorBrand.
  // Step 6: Set generator.[[GeneratorState]] to suspended-start.
  // Step 7: Let callerContext be the running execution context.
  // (Steps 5-7 are part of the SLOT setup.)
  SLOT.set(generator, {
    __proto__: null,
    [SLOT_GENERATOR_CONTEXT]: closure,
    [SLOT_GENERATOR_STATE]: GENERATOR_STATE_SUSPENDED_STARTED,
    [SLOT_UNDERLYING_ITERATOR]: undefined,
  })
  // Step 16: Return generator.
  return generator
}

function ensureObject(thisArg, what = 'this') {
  if (!isObjectType(thisArg)) {
    throw new TypeErrorCtor(`\`${what}\` value must be an Object`)
  }
}

// Based on https://tc39.es/ecma262/#sec-getiterator.
function getIterator(obj) {
  // Step 2.a: Let method be ? GetMethod(obj, %Symbol.iterator%).
  const method = obj[SymbolIterator]
  // Step 3: If method is undefined, throw a TypeError exception.
  if (typeof method !== 'function') {
    throw new TypeErrorCtor('Object is not iterable')
  }
  // Step 4: Return ? GetIteratorFromMethod(obj, method).
  return ReflectApply(method, obj, [])
}

// Based on https://tc39.es/ecma262/#sec-getiteratordirect.
function getIteratorDirect(obj) {
  // Step 1: Let nextMethod be ? Get(obj, "next").
  // Step 2: Let iteratorRecord be the Iterator Record
  // { [[Iterator]]: obj, [[NextMethod]]: nextMethod, [[Done]]: false }.
  // Step 3: Return iteratorRecord.
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
  // Step 4: Call method with obj
  const iterator = method ? ReflectApply(method, obj, []) : obj
  // Step 5: If iterator is not an Object, throw a TypeError
  ensureObject(iterator, 'iterator')
  // Step 6: Return GetIteratorDirect(iterator)
  return getIteratorDirect(iterator)
}

// Based on https://tc39.es/ecma262/#sec-getmethod.
function getMethod(obj, key) {
  // Step 1: Let func be ? GetV(V, P).
  const method = obj[key]
  // Step 2: If func is either undefined or null, return undefined.
  if (method === undefined || method === null) {
    return undefined
  }
  // Step 3: If IsCallable(func) is false, throw a TypeError exception.
  if (typeof method !== 'function') {
    throw new TypeErrorCtor('Method is not a function')
  }
  // Step 4: Return func.
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
      // Step 2: If value is an abrupt completion, return ? IteratorClose(iteratorRecord, value).
      iteratorClose(iterator)
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
  // Step 1: Assert: iteratorRecord.[[Iterator]] is an Object.
  ensureObject(iterator, 'iterator')
  // Step 2: Let iterator be iteratorRecord.[[Iterator]].
  // Step 3: Let innerResult be Completion(GetMethod(iterator, "return")).
  const returnMethod = getMethod(iterator, 'return')
  // Step 4.a: If return is undefined, return ? completion.
  if (returnMethod === undefined) {
    return completion
  }
  // Step 4.c: Set innerResult to Completion(Call(return, iterator)).
  const innerResult = ReflectApply(returnMethod, iterator, [])
  // Step 7: If innerResult.[[Value]] is not an Object, throw a TypeError exception.
  if (!isObjectType(innerResult)) {
    throw new TypeError('`Iterator.return` result must be an object')
  }
  // Step 8: Return ? completion.
  return completion
}

// Based on https://tc39.es/proposal-joint-iteration/#sec-closeall.
function iteratorCloseAll(openIters, completion) {
  // Step 1: For each element iter of openIters, in reverse List order, do
  for (let i = openIters.length - 1; i >= 0; i -= 1) {
    // Step 1.a: Set completion to Completion(IteratorClose(iter, completion)).
    iteratorClose(openIters[i], completion)
  }
  // Step 2: Return ? completion.
  if (completion) {
    throw completion
  }
}

// Based on https://tc39.es/proposal-joint-iteration/#sec-IteratorZip.
function iteratorZip(iters, mode, padding, finishResults = v => v) {
  // Step 1: Let iterCount be the number of elements in iters.
  const { length: iterCount } = iters
  // Step 2: Let openIters be a copy of iters.
  const openIters = [...iters]
  // Step 3: Define the generator closure.
  const generator = {
    next() {
      // Step 3.a: If iterCount = 0, return { value: undefined, done: true }.
      if (iterCount === 0) {
        return { value: undefined, done: true }
      }
      // Step 3.b.i: Let results be a new empty list.
      const results = []
      // Step 3.b.ii: Assert: openIters is not empty.
      let allNull = true
      for (let i = 0, { length } = openIters; i < length; i += 1) {
        if (openIters[i] !== null) {
          allNull = false
          break
        }
      }
      if (allNull) {
        return { value: undefined, done: true }
      }
      // Step 3.b.iii: For each integer i such that 0 ≤ i < iterCount, in ascending order, do.
      for (let i = 0; i < iterCount; i += 1) {
        const iter = openIters[i]
        // Step 3.b.iii.2: If iter is null, then.
        if (iter === null) {
          // Step 3.b.iii.2.a: Assert: mode is "longest".
          if (mode !== 'longest') {
            throw new ErrorCtor(
              'Invalid state: null iterator in non-longest mode',
            )
          }
          // Step 3.b.iii.2.b: Let result be padding[i].
          results.push(padding[i])
          continue
        }
        try {
          // Step 3.b.iii.3.a: Fetch the next value from the iterator.
          const next = ReflectApply(iter.next, iter.iterator, [])
          // Step 3.b.iii.3.d: If result is done, then.
          if (next.done) {
            // Step 3.b.iii.3.d.i: Remove iter from openIters.
            openIters[i] = null
            if (mode === 'shortest') {
              // Step 3.b.iii.3.d.ii: Return { value: undefined, done: true } in "shortest" mode.
              return { value: undefined, done: true }
            }
            // Step 3.b.iii.3.d.iv: Let result be padding[i].
            results.push(padding[i])
          } else {
            // Step 3.b.iii.3.c: Set result to the value.
            results.push(next.value)
          }
        } catch (e) {
          // Step 3.b.iii.3.b.i: Remove iter from openIters on abrupt completion.
          openIters[i] = null
          // Step 3.b.iii.3.b.ii: Return ? IteratorCloseAll(openIters, result).
          return iteratorCloseAll(openIters, e)
        }
      }
      // Step 3.b.iv: Set results to finishResults(results).
      const finalizedResults = finishResults(results)
      // Step 3.b.v: Yield the finalized results.
      return { value: finalizedResults, done: false }
    },
    return() {
      // Step 3.b.vi: Close all iterators when the zip iterator is terminated.
      iteratorCloseAll(openIters)
      return { value: undefined, done: true }
    },
    [SymbolIterator]() {
      // Step 3: The generator must be iterable.
      return this
    },
  }
  // Step 5: Set generator.[[UnderlyingIterators]] to openIters.
  setUnderlyingIterator(generator, openIters)
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
      [SLOT_UNDERLYING_ITERATOR]: undefined,
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
  toIntegerOrInfinity,
}
