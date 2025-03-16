declare const Arrays: {
  arrayChunk<T>(arr: T[], size?: number): T[][]
  arrayUnique<T>(arr: T[]): T[]
  joinAsList(arr: string[] | readonly string[]): string
}
declare namespace Arrays {}
export = Arrays
