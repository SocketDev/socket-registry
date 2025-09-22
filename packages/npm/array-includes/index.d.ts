import Impl from './implementation'
declare const {
  x: ArrayProtoIncludes,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoIncludes
