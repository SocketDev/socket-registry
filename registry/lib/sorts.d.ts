import constants from './constants'

declare type Internals = (typeof constants)[typeof constants.kInternalsSymbol]
declare const sortsModule: {
  localeCompare: Internals['localeCompare']
  naturalSort: Internals['naturalSort']
}
export = sortsModule
