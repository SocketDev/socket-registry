import Impl from './implementation'
declare const {
  x: ObjectFromEntries,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ObjectFromEntries
