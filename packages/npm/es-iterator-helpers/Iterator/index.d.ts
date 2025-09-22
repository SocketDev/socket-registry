import Impl from './implementation'
declare const {
  x: EsShimIteratorCtor,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsShimIteratorCtor
