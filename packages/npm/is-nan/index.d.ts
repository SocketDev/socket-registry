import Impl from './implementation'
declare const {
  x: NumberIsNaN,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = NumberIsNaN
