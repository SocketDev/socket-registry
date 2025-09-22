import Impl from './implementation'
declare const {
  x: StringProtoPadEnd,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoPadEnd
