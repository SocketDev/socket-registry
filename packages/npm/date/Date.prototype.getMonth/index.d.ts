import Impl from './implementation'
declare const {
  x: DateProtoGetMonth,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoGetMonth
