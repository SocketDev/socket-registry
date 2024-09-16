import Impl from './implementation'
// TODO: Rename type.
declare const {
  x: RenameStaticMethod
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = RenameStaticMethod
