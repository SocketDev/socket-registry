import Impl from './implementation'
declare const {
  x: EsIteratorProtoFlatMap,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorProtoFlatMap
