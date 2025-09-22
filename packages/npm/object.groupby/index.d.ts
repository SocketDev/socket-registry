import Impl from './implementation'
declare const {
  x: ObjectGroupBy,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ObjectGroupBy
