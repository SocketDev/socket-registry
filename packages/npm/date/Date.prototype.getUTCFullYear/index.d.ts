import Impl from './implementation'
declare const {
  x: DateProtoGetUTCFullYear,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoGetUTCFullYear
