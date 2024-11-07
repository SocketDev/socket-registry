import { IFastSort } from 'fast-sort'

declare const sortsModule: {
  localeCompare: Intl.Collator['compare']
  naturalSort: <T>(arr: T[]) => IFastSort<T>
}
export = sortsModule
