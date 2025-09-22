import Impl from './implementation'
declare const {
  x: ReflectGetPrototypeOf,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ReflectGetPrototypeOf
