import type { IFastSort } from 'fast-sort'

declare function localeCompare(a: string, b: string): number
declare const sortsModule: {
  localeCompare: typeof localeCompare
  naturalSort: <T>(arrayToSort: T[]) => IFastSort<T>
}
export = sortsModule
