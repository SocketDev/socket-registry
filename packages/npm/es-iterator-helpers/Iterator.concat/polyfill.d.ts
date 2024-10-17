import Impl from './implementation'
declare function getPolyfill(): () => typeof Impl
export = getPolyfill
