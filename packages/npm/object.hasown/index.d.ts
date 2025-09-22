import Impl from './implementation'
declare const {
  x: ObjectHasOwn,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ObjectHasOwn
