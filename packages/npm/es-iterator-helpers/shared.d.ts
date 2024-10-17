import EsIterator from './Iterator.prototype/implementation'
declare interface InternalShared {
  fixIterator<T>(iterator: EsIterator<T>): EsIterator<T>
  isIteratorNextCheckBuggy(
    IteratorPrototype: EsIterator<any>,
    methodName: string,
    ...args: any[]
  ): boolean
}
declare const shared: InternalShared
export = shared
