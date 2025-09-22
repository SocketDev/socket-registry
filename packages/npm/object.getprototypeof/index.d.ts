import Impl from './implementation'
declare const {
  x: ObjectGetPrototypeOf,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ObjectGetPrototypeOf
