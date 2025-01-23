import constants from './constants'

declare type Internals = (typeof constants)[typeof constants.kInternalsSymbol]
declare const sortsModule: {
  localeCompare: Internals['localeCompare']
  naturalCompare: Internals['naturalCompare']
  naturalSorter: Internals['naturalSorter']
}
export = sortsModule
