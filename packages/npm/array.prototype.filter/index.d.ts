import Impl from './implementation'
declare const {
  x: ArrayProtoFilter,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoFilter
