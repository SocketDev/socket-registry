import Impl from './implementation'
declare const {
  x: EsIteratorProto,
}: {
  x: Impl<any> & {
    getPolyfill(): Impl<any>
    shim(): Impl<any>
  }
}
export = EsIteratorProto
