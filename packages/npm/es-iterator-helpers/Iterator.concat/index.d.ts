import Impl from './implementation'
declare const {
  x: EsIteratorConcat
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorConcat
