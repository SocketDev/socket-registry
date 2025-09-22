import Impl from './implementation'
declare const {
  x: ArrayProtoFindLast,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoFindLast
