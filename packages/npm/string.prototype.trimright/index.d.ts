import Impl from './implementation'
declare const {
  x: StringProtoTrimRight,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoTrimRight
