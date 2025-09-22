import Impl from './implementation'
declare const {
  x: StringProtoReplaceAll,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoReplaceAll
