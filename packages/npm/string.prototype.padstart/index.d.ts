import Impl from './implementation'
declare const {
  x: StringProtoPadStart,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = StringProtoPadStart
