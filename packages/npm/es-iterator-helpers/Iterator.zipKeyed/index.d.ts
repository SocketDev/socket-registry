import Impl from './implementation'
declare const {
  x: EsIteratorZipKeyed
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorZipKeyed
