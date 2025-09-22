import Impl from './implementation'
declare const {
  x: DateCtor,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = DateCtor
