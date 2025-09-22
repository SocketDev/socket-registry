import Impl from './implementation'
declare const {
  x: ObjectValues,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ObjectValues
