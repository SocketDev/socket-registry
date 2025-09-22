import Impl from './implementation'
declare const {
  x: StringProtoTrimStart,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoTrimStart
