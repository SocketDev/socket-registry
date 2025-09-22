import Impl from './implementation'
declare const {
  x: DateProtoToDateString,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoToDateString
