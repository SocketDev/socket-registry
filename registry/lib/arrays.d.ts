declare const Arrays: {
  arrayChunk<T>(arr: T[] | readonly T[], size?: number): T[][]
  arrayUnique<T>(arr: T[] | readonly T[]): T[]
  joinAnd(arr: string[] | readonly string[]): string
  joinOr(arr: string[] | readonly string[]): string
}
declare namespace Arrays {}
export = Arrays
