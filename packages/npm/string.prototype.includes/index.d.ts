import Impl from './implementation'
declare const {
  x: StringProtoIncludes,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoIncludes
