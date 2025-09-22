import Impl from './implementation'
declare const {
  x: StringProtoEndsWith,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoEndsWith
