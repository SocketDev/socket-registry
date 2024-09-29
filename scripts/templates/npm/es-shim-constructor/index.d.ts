import Impl from './implementation'
// TODO: Rename type.
declare const {
  x: RenameCtor
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = RenameCtor
