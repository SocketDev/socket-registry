import Impl from './implementation'
declare const {
  x: StringProtoStartsWith
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoStartsWith