import Impl from './implementation'
declare const {
  x: DateProtoToUTCString,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoToUTCString
