import Impl from './implementation'
declare const {
  x: EsIteratorProtoForEach
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorProtoForEach