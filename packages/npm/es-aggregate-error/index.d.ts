import Impl from './implementation'
declare const {
  x: AggregateErrorCtor,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = AggregateErrorCtor
