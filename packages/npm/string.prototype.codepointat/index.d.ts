import Impl from './implementation'
declare const {
  x: StringProtoCodePointAt,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoCodePointAt
