import Impl from './implementation'
declare const {
  x: EsIteratorZip,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorZip
