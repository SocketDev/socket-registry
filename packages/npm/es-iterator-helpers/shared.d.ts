import EsIterator from './Iterator.prototype/implementation'
declare const isIteratorNextCheckBuggy: boolean
declare function fixIterator<T>(iterator: EsIterator<T>): EsIterator<T>
export = { fixIterator, isIteratorNextCheckBuggy }
