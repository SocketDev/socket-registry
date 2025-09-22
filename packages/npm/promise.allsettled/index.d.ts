import Impl from './implementation'
declare const {
  x: PromiseAllSettled,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = PromiseAllSettled
