import EsIterator from './Iterator.prototype/implementation'
declare interface InternalShared {
  fixIterator<T>(iterator: EsIterator<T>): EsIterator<T>
  isIteratorNextCheckBuggy: boolean
}
declare const shared: InternalShared
export = shared
