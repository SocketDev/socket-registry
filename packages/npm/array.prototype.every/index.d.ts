import Impl from './implementation'
declare const {
  x: ArrayProtoEvery,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoEvery
