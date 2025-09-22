import Impl from './implementation'
declare const {
  x: StringProtoTrimEnd,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoTrimEnd
