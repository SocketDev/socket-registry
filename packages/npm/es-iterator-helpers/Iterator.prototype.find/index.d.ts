import Impl from './implementation'
declare const {
  x: EsIteratorProtoFind,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorProtoFind
