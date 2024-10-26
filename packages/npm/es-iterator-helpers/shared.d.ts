declare interface IteratorResult<T> {
  value: T
  done: boolean
}
declare interface Iterator<T> {
  next(value?: any): IteratorResult<T>
  return?(value?: any): IteratorResult<T>
  [Symbol.iterator](): Iterator<T>
}
declare interface InternalShared {
  SLOT: WeakMap<any, any>
  SLOT_GENERATOR_CONTEXT: string
  SLOT_GENERATOR_STATE: string
  SLOT_UNDERLYING_ITERATOR: string
  GENERATOR_STATE_COMPLETED: string
  GENERATOR_STATE_SUSPENDED_STARTED: string
  IteratorCtor: typeof globalThis.Iterator
  IteratorPrototype: any
  IteratorHelperPrototype: any
  NumberCtor: NumberConstructor
  MathTrunc: (x: number) => number
  NegativeInfinity: number
  NumberIsNaN: (x: number) => boolean
  ObjectCreate: <T>(o: T, properties?: PropertyDescriptorMap) => T
  ObjectDefineProperty: typeof Object.defineProperty
  RangeErrorCtor: typeof RangeError
  ReflectApply: (target: Function, thisArg: any, args: any[]) => any
  ReflectGetPrototypeOf: (target: any) => any
  SymbolIterator: symbol
  SymbolToStringTag: symbol
  TypeErrorCtor: typeof TypeError
  abruptCloseIterator(iterator: Iterator<any>, error: any): void
  closeIterator<T>(iterator: Iterator<any>, completion: T): T
  createIteratorFromClosure<T>(closure: Iterator<T>): Iterator<T>
  ensureObject(thisArg: any, what?: string): void
  getIteratorDirect<T>(obj: any): {
    next: () => IteratorResult<T>
    iterator: Iterator<T>
  }
  getIteratorFlattenable(obj: any): {
    next: () => IteratorResult<any>
    iterator: Iterator<any>
  }
  getMethod(
    obj: any,
    key: string | symbol
  ): ((...args: any[]) => any) | undefined
  getSlot(O: any, slot: string): any
  isIteratorProtoNextCheckBuggy(
    method: (...args: any[]) => any,
    arg: any
  ): boolean
  isObjectType(value: any): boolean
  resolveSlots(O: any, slot: string): any
  setSlot(O: any, slot: string, value: any): void
  setUnderlyingIterator(generator: any, iterator: any): void
  toIntegerOrInfinity(value: any): number
}
declare const shared: InternalShared
export = shared
