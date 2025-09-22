import Impl from './implementation'
declare const {
  x: ArrayBufferProtoSlice,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayBufferProtoSlice
