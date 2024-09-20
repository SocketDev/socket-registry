declare interface InternalSlot {
  assert(O: WeakKey, slot: string): void
  check(O: WeakKey, slot: string): void
  has(O: WeakKey, slot: string): boolean
  get(O: WeakKey, slot: string): any
  set(O: WeakKey, slot: string, value: any): void
}
declare const internalSlot: InternalSlot
export = internalSlot
