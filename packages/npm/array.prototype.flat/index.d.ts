import Impl from './implementation'
declare const {
  x: ArrayProtoFlat,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoFlat
