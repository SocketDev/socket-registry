import Impl from './implementation'
declare const {
  x: ArrayProtoReduce,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ArrayProtoReduce
