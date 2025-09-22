import Impl from './implementation'
declare const {
  x: StringProtoSplit,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoSplit
