import Impl from './implementation'
declare const {
  x: DateProtoToJSON,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateProtoToJSON
