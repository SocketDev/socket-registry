import Impl from './implementation'
declare function shim(): () => typeof Impl
export = shim
