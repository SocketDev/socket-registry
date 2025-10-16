/**
 * @fileoverview Object manipulation and reflection utilities.
 * Provides type-safe object operations, property access, and structural helpers.
 */

import {
  kInternalsSymbol,
  LOOP_SENTINEL,
  UNDEFINED_TOKEN,
} from '#constants/core'

import { isArray } from './arrays'
import { localeCompare } from './sorts'

// Type definitions
type GetterDefObj = { [key: PropertyKey]: () => unknown }
type LazyGetterStats = { initialized?: Set<PropertyKey> | undefined }
type ConstantsObjectOptions = {
  getters?: GetterDefObj | undefined
  internals?: object | undefined
  mixin?: object | undefined
}
type Remap<T> = { [K in keyof T]: T[K] } extends infer O
  ? { [K in keyof O]: O[K] }
  : never

// Type for dynamic lazy getter record.
type LazyGetterRecord<T> = {
  [key: PropertyKey]: () => T
}

// Type for generic property bag.
type PropertyBag = {
  [key: PropertyKey]: unknown
}

// Type for generic sorted object entries.
type SortedObject<T> = {
  [key: PropertyKey]: T
}

export type { GetterDefObj, LazyGetterStats, ConstantsObjectOptions, Remap }

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ObjectDefineProperties = Object.defineProperties
const ObjectDefineProperty = Object.defineProperty
const ObjectFreeze = Object.freeze
const ObjectFromEntries = Object.fromEntries
const ObjectGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors
const ObjectGetOwnPropertyNames = Object.getOwnPropertyNames
const ObjectGetPrototypeOf = Object.getPrototypeOf
const ObjectHasOwn = Object.hasOwn
const ObjectKeys = Object.keys
const ObjectPrototype = Object.prototype
const ObjectSetPrototypeOf = Object.setPrototypeOf
// @ts-expect-error - __defineGetter__ exists but not in type definitions.
// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const __defineGetter__ = Object.prototype.__defineGetter__
// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ReflectOwnKeys = Reflect.ownKeys

/**
 * Create a lazy getter function that memoizes its result.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createLazyGetter<T>(
  name: PropertyKey,
  getter: () => T,
  stats?: LazyGetterStats,
): () => T {
  let lazyValue: T | typeof UNDEFINED_TOKEN = UNDEFINED_TOKEN
  // Dynamically name the getter without using Object.defineProperty.
  const { [name]: lazyGetter } = {
    [name]() {
      if (lazyValue === UNDEFINED_TOKEN) {
        stats?.initialized?.add(name)
        lazyValue = getter()
      }
      return lazyValue as T
    },
  } as LazyGetterRecord<T>
  return lazyGetter as unknown as () => T
}

/**
 * Create a frozen constants object with lazy getters and internal properties.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createConstantsObject(
  props: object,
  options_?: ConstantsObjectOptions,
): Readonly<object> {
  const options = { __proto__: null, ...options_ } as ConstantsObjectOptions
  const attributes = ObjectFreeze({
    __proto__: null,
    getters: options.getters
      ? ObjectFreeze(
          ObjectSetPrototypeOf(toSortedObject(options.getters), null),
        )
      : undefined,
    internals: options.internals
      ? ObjectFreeze(
          ObjectSetPrototypeOf(toSortedObject(options.internals), null),
        )
      : undefined,
    mixin: options.mixin
      ? ObjectFreeze(
          ObjectDefineProperties(
            { __proto__: null },
            ObjectGetOwnPropertyDescriptors(options.mixin),
          ),
        )
      : undefined,
    props: props
      ? ObjectFreeze(ObjectSetPrototypeOf(toSortedObject(props), null))
      : undefined,
  })
  const lazyGetterStats = ObjectFreeze({
    __proto__: null,
    initialized: new Set<PropertyKey>(),
  })
  const object = defineLazyGetters(
    {
      __proto__: null,
      [kInternalsSymbol]: ObjectFreeze({
        __proto__: null,
        get attributes() {
          return attributes
        },
        get lazyGetterStats() {
          return lazyGetterStats
        },
        ...attributes.internals,
      }),
      kInternalsSymbol,
      ...attributes.props,
    },
    attributes.getters,
    lazyGetterStats,
  )
  if (attributes.mixin) {
    ObjectDefineProperties(
      object,
      toSortedObjectFromEntries(
        objectEntries(ObjectGetOwnPropertyDescriptors(attributes.mixin)).filter(
          p => !ObjectHasOwn(object, p[0]),
        ),
      ) as PropertyDescriptorMap,
    )
  }
  return ObjectFreeze(object)
}

/**
 * Define a getter property on an object.
 */
/*@__NO_SIDE_EFFECTS__*/
export function defineGetter<T>(
  object: object,
  propKey: PropertyKey,
  getter: () => T,
): object {
  ObjectDefineProperty(object, propKey, {
    get: getter,
    enumerable: false,
    configurable: true,
  })
  return object
}

/**
 * Define a lazy getter property on an object.
 */
/*@__NO_SIDE_EFFECTS__*/
export function defineLazyGetter<T>(
  object: object,
  propKey: PropertyKey,
  getter: () => T,
  stats?: LazyGetterStats,
): object {
  return defineGetter(object, propKey, createLazyGetter(propKey, getter, stats))
}

/**
 * Define multiple lazy getter properties on an object.
 */
/*@__NO_SIDE_EFFECTS__*/
export function defineLazyGetters(
  object: object,
  getterDefObj: GetterDefObj | undefined,
  stats?: LazyGetterStats,
): object {
  if (getterDefObj !== null && typeof getterDefObj === 'object') {
    const keys = ReflectOwnKeys(getterDefObj)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i] as PropertyKey
      defineLazyGetter(
        object,
        key,
        createLazyGetter(key, getterDefObj[key] as () => unknown, stats),
      )
    }
  }
  return object
}

/**
 * Compare two entry arrays by their keys for sorting.
 */
/*@__NO_SIDE_EFFECTS__*/
export function entryKeyComparator(
  a: [PropertyKey, unknown],
  b: [PropertyKey, unknown],
): number {
  const keyA = a[0]
  const keyB = b[0]
  const strKeyA = typeof keyA === 'string' ? keyA : String(keyA)
  const strKeyB = typeof keyB === 'string' ? keyB : String(keyB)
  return localeCompare(strKeyA, strKeyB)
}

/**
 * Get the enumerable own property keys of an object.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getKeys(obj: unknown): string[] {
  return isObject(obj) ? ObjectKeys(obj) : []
}

/**
 * Get an own property value from an object safely.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getOwn(obj: unknown, propKey: PropertyKey): unknown {
  if (obj === null || obj === undefined) {
    return undefined
  }
  return ObjectHasOwn(obj as object, propKey)
    ? (obj as Record<PropertyKey, unknown>)[propKey]
    : undefined
}

/**
 * Get all own property values from an object.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getOwnPropertyValues<T>(
  obj: { [key: PropertyKey]: T } | null | undefined,
): T[] {
  if (obj === null || obj === undefined) {
    return []
  }
  const keys = ObjectGetOwnPropertyNames(obj)
  const { length } = keys
  const values = Array(length)
  for (let i = 0; i < length; i += 1) {
    values[i] = obj[keys[i] as string]
  }
  return values
}

/**
 * Check if an object has any enumerable own properties.
 */
/*@__NO_SIDE_EFFECTS__*/
export function hasKeys(obj: unknown): obj is PropertyBag {
  if (obj === null || obj === undefined) {
    return false
  }
  for (const key in obj as object) {
    if (ObjectHasOwn(obj as object, key)) {
      return true
    }
  }
  return false
}

/**
 * Check if an object has an own property.
 */
/*@__NO_SIDE_EFFECTS__*/
export function hasOwn(
  obj: unknown,
  propKey: PropertyKey,
): obj is object & PropertyBag {
  if (obj === null || obj === undefined) {
    return false
  }
  return ObjectHasOwn(obj as object, propKey)
}

/**
 * Check if a value is an object (including arrays).
 */
/*@__NO_SIDE_EFFECTS__*/
export function isObject(
  value: unknown,
): value is { [key: PropertyKey]: unknown } {
  return value !== null && typeof value === 'object'
}

/**
 * Check if a value is a plain object (not an array, not a built-in).
 */
/*@__NO_SIDE_EFFECTS__*/
export function isObjectObject(
  value: unknown,
): value is { [key: PropertyKey]: unknown } {
  if (value === null || typeof value !== 'object' || isArray(value)) {
    return false
  }
  const proto = ObjectGetPrototypeOf(value)
  return proto === null || proto === ObjectPrototype
}

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3

/**
 * Alias for native Object.assign.
 * Copies all enumerable own properties from one or more source objects to a target object.
 */
export const objectAssign = Object.assign

/**
 * Get all own property entries (key-value pairs) from an object.
 */
/*@__NO_SIDE_EFFECTS__*/
export function objectEntries(obj: unknown): Array<[PropertyKey, unknown]> {
  if (obj === null || obj === undefined) {
    return []
  }
  const keys = ReflectOwnKeys(obj as object)
  const { length } = keys
  const entries = Array(length)
  const record = obj as Record<PropertyKey, unknown>
  for (let i = 0; i < length; i += 1) {
    const key = keys[i] as PropertyKey
    entries[i] = [key, record[key]]
  }
  return entries
}

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3

/**
 * Alias for native Object.freeze.
 * Freezes an object, preventing new properties from being added and existing properties from being removed or modified.
 */
export const objectFreeze = Object.freeze

/**
 * Deep merge source object into target object.
 */
/*@__NO_SIDE_EFFECTS__*/
export function merge<T extends object, U extends object>(
  target: T,
  source: U,
): T & U {
  if (!isObject(target) || !isObject(source)) {
    return target as T & U
  }
  const queue: Array<[unknown, unknown]> = [[target, source]]
  let pos = 0
  let { length: queueLength } = queue
  while (pos < queueLength) {
    if (pos === LOOP_SENTINEL) {
      throw new Error('Detected infinite loop in object crawl of merge')
    }
    const { 0: currentTarget, 1: currentSource } = queue[pos++] as [
      Record<PropertyKey, unknown>,
      Record<PropertyKey, unknown>,
    ]

    if (!currentSource || !currentTarget) {
      continue
    }

    const isSourceArray = isArray(currentSource)
    const isTargetArray = isArray(currentTarget)

    // Skip array merging - arrays in source replace arrays in target
    if (isSourceArray || isTargetArray) {
      continue
    }

    const keys = ReflectOwnKeys(currentSource as object)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i] as PropertyKey
      const srcVal = currentSource[key]
      const targetVal = currentTarget[key]
      if (isArray(srcVal)) {
        // Replace arrays entirely
        currentTarget[key] = srcVal
      } else if (isObject(srcVal)) {
        if (isObject(targetVal) && !isArray(targetVal)) {
          queue[queueLength++] = [targetVal, srcVal]
        } else {
          currentTarget[key] = srcVal
        }
      } else {
        currentTarget[key] = srcVal
      }
    }
  }
  return target as T & U
}

/**
 * Convert an object to a new object with sorted keys.
 */
/*@__NO_SIDE_EFFECTS__*/
export function toSortedObject<T extends object>(obj: T): T {
  return toSortedObjectFromEntries(objectEntries(obj)) as T
}

/**
 * Create an object from entries with sorted keys.
 */
/*@__NO_SIDE_EFFECTS__*/
export function toSortedObjectFromEntries<T = unknown>(
  entries: Iterable<[PropertyKey, T]>,
): SortedObject<T> {
  const otherEntries = []
  const symbolEntries = []
  // Use for-of to work with entries iterators.
  for (const entry of entries) {
    if (typeof entry[0] === 'symbol') {
      symbolEntries.push(entry)
    } else {
      otherEntries.push(entry)
    }
  }
  if (!otherEntries.length && !symbolEntries.length) {
    return {}
  }
  return ObjectFromEntries([
    // The String constructor is safe to use with symbols.
    ...symbolEntries.sort(entryKeyComparator),
    ...otherEntries.sort(entryKeyComparator),
  ])
}
