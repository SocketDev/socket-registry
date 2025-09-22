import Impl from './implementation'
declare const {
  x: StringProtoTrim,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoTrim
