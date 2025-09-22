import Impl from './implementation'
declare const {
  x: StringProtoMatchAll,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoMatchAll
