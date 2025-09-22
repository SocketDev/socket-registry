import Impl from './implementation'
declare const {
  x: DateProtoToISOString,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoToISOString
