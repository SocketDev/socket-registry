import constants from './constants'

declare type Internals = (typeof constants)[typeof constants.kInternalsSymbol]
declare const Sorts: {
  localeCompare: Internals['localeCompare']
  naturalCompare: Internals['naturalCompare']
  naturalSorter: Internals['naturalSorter']
}
declare namespace Sorts {}
export = Sorts
