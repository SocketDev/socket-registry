import Impl from './implementation'
declare const {
  x: UtilPromisify,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = UtilPromisify
