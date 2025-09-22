import Impl from './implementation'
declare const {
  x: EsIteratorProtoToArray,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorProtoToArray
