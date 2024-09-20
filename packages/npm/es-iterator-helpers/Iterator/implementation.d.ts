import EsIterator from '../Iterator.prototype/implementation'
declare interface EsIteratorConstructor {
  new (): EsIterator<any>
  new <T>(): EsIterator<T>
  readonly prototype: EsIterator<any>
}
declare const Iterator: EsIteratorConstructor
export = Iterator
