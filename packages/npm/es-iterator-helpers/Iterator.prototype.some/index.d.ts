import Impl from './implementation'
declare const {
  x: EsIteratorProtoSome,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorProtoSome
