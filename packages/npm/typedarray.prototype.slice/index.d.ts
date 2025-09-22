import Impl from './implementation'
declare const {
  x: TypedArrayProtoSlice,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = TypedArrayProtoSlice
