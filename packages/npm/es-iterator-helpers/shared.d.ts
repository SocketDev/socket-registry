import EsIterator from './Iterator.prototype/implementation'
declare interface InternalShared {
  isIteratorNextCheckBuggy: boolean
  fixIterator<T>(iterator: EsIterator<T>): EsIterator<T>
}
export = InternalShared
