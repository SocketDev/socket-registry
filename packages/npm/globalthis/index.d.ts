import Impl from './implementation'
declare const {
  x: GlobalThis,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = GlobalThis
