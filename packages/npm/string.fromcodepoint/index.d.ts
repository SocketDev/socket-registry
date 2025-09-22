import Impl from './implementation'
declare const {
  x: StringFromCodePoint,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringFromCodePoint
