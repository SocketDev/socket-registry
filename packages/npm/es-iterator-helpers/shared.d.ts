declare interface Iterator<T> {
  next(value?: any): IteratorResult<T>
  return?(value?: any): IteratorResult<T>
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
  closeIterator<T>(iterator: Iterator<T>, completion: T): T
  createIteratorFromClosure<T>(closure: Iterator<T>): Iterator<T>
  ensureObject(thisArg: any, what?: string): void
  getIteratorDirect<T>(obj: any): IteratorRecord<T>
  getIteratorFlattenable(obj: any): IteratorRecord<any>
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
  setUnderlyingIterator(generator: Iterator<any>, iterator: Iterator<any>): void
  setIterated(wrapper: Iterator<any>, record: IteratorRecord<any>): void
  toIntegerOrInfinity(value: any): number
}
declare const shared: InternalShared
export = shared
