'use strict'

//const { toString: fnToStr } = Function.prototype
const ArrayCtor = Array
const { trunc: MathTrunc } = Math
const { isNaN: NumberIsNaN } = Number
const {
  create: ObjectCreate,
  defineProperty: ObjectDefineProperty,
  hasOwn: ObjectHasOwn
} = Object
const { apply: ReflectApply, getPrototypeOf: ReflectGetPrototypeOf } = Reflect
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

// Based on specification text:
// https://tc39.es/ecma262/#sec-%iteratorhelperprototype%-object
const IteratorHelperPrototype = ObjectCreate(IteratorPrototype, {
  next: {
    __proto__: null,
    configurable: true,
    enumerable: false,
    value: function next() {
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
      try {
        // Execute the closure's next function to apply transformations (like map)
        const nextValue = ReflectApply(generatorNext, generator, [])
        if (nextValue.done) {
          setSlot(this, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
        }
        return nextValue
      } catch (error) {
        setSlot(this, SLOT_GENERATOR_STATE, GENERATOR_STATE_COMPLETED)
        throw error
      }
    },
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

// Based on specification text:
// https://tc39.es/ecma262/#sec-%wrapforvaliditeratorprototype%-object
const WrapForValidIteratorPrototype = ObjectCreate(IteratorPrototype, {
  // Based on specification text:
  // https://tc39.es/ecma262/#sec-%wrapforvaliditeratorprototype%.next
  next: {
    __proto__: null,
    configurable: true,
    enumerable: false,
    value: function next() {
      // Step 1: Let O be this value.
      const O = this
      // Step 2: Perform RequireInternalSlot(O, [[Iterated]])
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
  // Based on specification text:
  // https://tc39.es/ecma262/#sec-%wrapforvaliditeratorprototype%.return
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

// Based on specification text:
// https://tc39.es/ecma262/#sec-ifabruptcloseiterator
function abruptCloseIterator(iterator, error) {
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

// Based on specification text:
// https://tc39.es/ecma262/#sec-iteratorclose
function closeIterator(iterator, completion) {
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

// Based on specification text:
// https://tc39.es/ecma262/#sec-createiteratorfromclosure
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

// Based on specification text:
// https://tc39.es/ecma262/#sec-getiteratordirect
function getIteratorDirect(obj) {
  const { next } = obj
  if (typeof next !== 'function') {
    throw new TypeErrorCtor('`next` method must be callable')
  }
  return { next, iterator: obj, done: false }
}

// Based on specification text:
// https://tc39.es/ecma262/#sec-getiteratorflattenable
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

// Based on specification text:
// https://tc39.es/ecma262/#sec-getmethod
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

function getSlot(O, slot) {
  const slots = resolveSlots(O, slot)
  return slots[slot]
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

function isObjectType(value) {
  return (
    typeof value === 'function' || (value !== null && typeof value === 'object')
  )
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

function setIterated(wrapper, record) {
  setSlot(wrapper, SLOT_ITERATED, record)
}

function setUnderlyingIterator(generator, iterator) {
  setSlot(generator, SLOT_UNDERLYING_ITERATOR, iterator)
}

// Based on specification text:
// https://tc39.es/ecma262/#sec-tointegerorinfinity
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
  RangeErrorCtor,
  ReflectApply,
  ReflectGetPrototypeOf,
  SymbolIterator,
  TypeErrorCtor,
  WrapForValidIteratorPrototype,
  abruptCloseIterator,
  closeIterator,
  createIteratorFromClosure,
  ensureObject,
  getIteratorDirect,
  getIteratorFlattenable,
  getMethod,
  isIteratorProtoNextCheckBuggy,
  isObjectType,
  setIterated,
  setUnderlyingIterator,
  toIntegerOrInfinity
}
