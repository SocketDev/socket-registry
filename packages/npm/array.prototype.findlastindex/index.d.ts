import Impl from './implementation'
declare const {
  x: ArrayProtoFindLastIndex,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoFindLastIndex
