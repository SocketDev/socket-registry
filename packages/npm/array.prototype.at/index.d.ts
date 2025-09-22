import Impl from './implementation'
declare const {
  x: ArrayProtoAt,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoAt
