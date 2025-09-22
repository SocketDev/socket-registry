import Impl from './implementation'
declare const {
  x: ObjectAssign,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ObjectAssign
