import Impl from './implementation'
// TODO: Rename type.
declare const {
  x: RenameProtoMethod
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = RenameProtoMethod
