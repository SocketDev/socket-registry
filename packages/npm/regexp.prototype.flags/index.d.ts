import Impl from './implementation'
declare const {
  x: RegExpProtoFlags,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = RegExpProtoFlags
