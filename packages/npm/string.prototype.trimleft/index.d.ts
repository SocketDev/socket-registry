import Impl from './implementation'
declare const {
  x: StringProtoTrimLeft,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoTrimLeft
