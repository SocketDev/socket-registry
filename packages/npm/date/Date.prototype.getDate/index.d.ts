import Impl from './implementation'
declare const {
  x: DateProtoGetDate,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoGetDate
