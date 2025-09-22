import Impl from './implementation'
declare const {
  x: PromiseAny,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = PromiseAny
