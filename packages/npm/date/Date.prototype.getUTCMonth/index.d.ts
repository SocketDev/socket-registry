import Impl from './implementation'
declare const {
  x: DateProtoGetUTCMonth,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoGetUTCMonth
