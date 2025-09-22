import Impl from './implementation'
declare const {
  x: ReflectOwnKeys,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ReflectOwnKeys
