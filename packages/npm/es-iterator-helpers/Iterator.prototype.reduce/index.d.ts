import Impl from './implementation'
declare const {
  x: EsIteratorProtoReduce
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorProtoReduce
