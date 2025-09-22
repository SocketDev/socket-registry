import Impl from './implementation'
declare const {
  x: ArrayFrom,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayFrom
