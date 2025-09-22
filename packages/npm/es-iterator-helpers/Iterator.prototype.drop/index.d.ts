import Impl from './implementation'
declare const {
  x: EsIteratorProtoDrop,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorProtoDrop
