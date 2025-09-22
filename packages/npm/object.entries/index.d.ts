import Impl from './implementation'
declare const {
  x: ObjectEntries,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ObjectEntries
