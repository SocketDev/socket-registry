import Impl from './implementation'
declare const {
  x: FunctionProtoName,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = FunctionProtoName
