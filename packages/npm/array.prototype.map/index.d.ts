import Impl from './implementation'
declare const {
  x: ArrayProtoMap,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoMap
