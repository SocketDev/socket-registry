declare type FinishResults<T, U> = (results: T[]) => U
interface IteratorRecord<T> {
  iterator: Iterator<T>
  next: () => IteratorResult<T>
}
declare interface Iterator<T> {
  next(value?: any | undefined): IteratorResult<T>
  return?(value?: any | undefined): IteratorResult<T>
  [Symbol.iterator](): Iterator<T>
}
declare interface IteratorHelper<T> extends Iterator<T> {
  [Symbol.toStringTag](): 'Iterator Helper'
}
declare interface IteratorRecord<T> {
  iterator: Iterator<T>
  next: () => IteratorResult<T>
}
declare interface IteratorResult<T> {
  value: T
  done: boolean
}
declare type Mode = 'longest' | 'shortest' | 'strict'
declare interface InternalShared {
  SLOT: WeakMap<any, any>
  SLOT_GENERATOR_CONTEXT: string
  SLOT_GENERATOR_STATE: string
  SLOT_ITERATED: string
  SLOT_UNDERLYING_ITERATOR: string
  GENERATOR_STATE_COMPLETED: string
  GENERATOR_STATE_SUSPENDED_STARTED: string
  IteratorCtor: typeof globalThis.Iterator
  ArrayCtor: ArrayConstructor
  IteratorPrototype: Iterator<any>
  IteratorHelperPrototype: IteratorHelper<any>
  WrapForValidIteratorPrototype: Iterator<any>
  NumberCtor: NumberConstructor
  MathTrunc: typeof Math.trunc
  NegativeInfinity: number
  NumberIsNaN: typeof Number.isNaN
  ObjectCreate: typeof Object.create
  ObjectDefineProperty: typeof Object.defineProperty
  ObjectGetOwnPropertyDescriptor: typeof Object.getOwnPropertyDescriptor
  RangeErrorCtor: typeof RangeError
  ReflectApply: typeof Reflect.apply
  ReflectGetPrototypeOf: typeof Reflect.getPrototypeOf
  ReflectOwnKeys: typeof Reflect.ownKeys
  SymbolIterator: symbol
  SymbolToStringTag: symbol
  TypeErrorCtor: typeof TypeError
  createIteratorFromClosure<T>(closure: Iterator<T>): Iterator<T>
  ensureObject(thisArg: any, what?: string | undefined): void
  getIterator<T>(obj: any): Iterator<T>
  getIteratorDirect<T>(obj: any): IteratorRecord<T>
  getIteratorFlattenable(obj: any): IteratorRecord<any>
  getMethod(
    obj: any,
    key: string | symbol,
  ): ((...args: any[]) => any) | undefined
  getOptionsObject<T = any>(options: T): T extends object ? T : {}
  getSlot(O: any, slot: string): any
  ifAbruptCloseIterator(iterator: Iterator<any>, error: any): void
  isIteratorProtoNextCheckBuggy(
    method: (...args: any[]) => any,
    arg: any,
  ): boolean
  iteratorClose<T>(iterator: Iterator<T>, completion: T): T
  iteratorZip<T, U = T>(
    iters: Array<IteratorRecord<T>>,
    mode: Mode,
    padding: Array<U | undefined>,
    finishResults?: FinishResults<T, U>,
  ): Generator<U, void, unknown>
  resolveSlots(O: any, slot: string): any
  setSlot(O: any, slot: string, value: any): void
  setUnderlyingIterator(generator: Iterator<any>, iterator: Iterator<any>): void
  setIterated(wrapper: Iterator<any>, record: IteratorRecord<any>): void
  toIntegerOrInfinity(value: any): number
}
declare const shared: InternalShared
export = shared
