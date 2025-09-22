import Impl from './implementation'
declare const {
  x: DateProtoToString,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoToString
