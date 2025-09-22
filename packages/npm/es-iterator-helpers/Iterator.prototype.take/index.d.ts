import Impl from './implementation'
declare const {
  x: EsIteratorProtoTake,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorProtoTake
