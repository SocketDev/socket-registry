import Impl from './implementation'
declare const {
  x: EsIteratorProtoIncludes,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = EsIteratorProtoIncludes
