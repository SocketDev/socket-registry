import { IFastSort } from 'fast-sort'

declare const Sorts: {
  localeCompare: Intl.Collator['compare']
  naturalCompare: Intl.Collator['compare']
  naturalSorter: <T>(arrayToSort: T[]) => IFastSort<T>
}
declare namespace Sorts {}
export = Sorts
