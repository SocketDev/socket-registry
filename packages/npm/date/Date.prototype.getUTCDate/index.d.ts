import Impl from './implementation'
declare const {
  x: DateProtoGetUTCDate,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoGetUTCDate
