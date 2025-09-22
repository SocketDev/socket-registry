import Impl from './implementation'
declare const {
  x: DateNow,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateNow
