import Impl from './implementation'
declare const {
  x: ObjectIs,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ObjectIs
