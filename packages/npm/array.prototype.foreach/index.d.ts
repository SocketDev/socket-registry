import Impl from './implementation'
declare const {
  x: ArrayProtoForEach,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoForEach
