import Impl from './implementation'
declare const {
  x: StringProtoRepeat,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoRepeat
