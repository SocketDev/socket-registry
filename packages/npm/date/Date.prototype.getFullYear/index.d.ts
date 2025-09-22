import Impl from './implementation'
declare const {
  x: DateProtoGetFullYear,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoGetFullYear
