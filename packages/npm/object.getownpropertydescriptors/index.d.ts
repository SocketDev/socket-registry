import Impl from './implementation'
declare const {
  x: ObjectGetOwnPropertyDescriptors,
}: {
  x: typeof Impl & {
    getPolyfill(): typeof Impl
    shim(): typeof Impl
  }
}
export = ObjectGetOwnPropertyDescriptors
