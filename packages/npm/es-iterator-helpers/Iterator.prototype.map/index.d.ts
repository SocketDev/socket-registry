import Impl from './implementation'
declare const {
  x: EsIteratorProtoMap,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorProtoMap
