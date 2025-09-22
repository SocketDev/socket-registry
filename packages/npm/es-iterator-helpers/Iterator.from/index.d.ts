import Impl from './implementation'
declare const {
  x: EsIteratorFrom,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorFrom
