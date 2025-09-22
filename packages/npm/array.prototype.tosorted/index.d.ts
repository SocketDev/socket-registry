import Impl from './implementation'
declare const {
  x: ArrayProtoToSorted,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoToSorted
