declare function arrayChunk<T>(arr: T[], size?: number): T[][]
declare function arrayUnique<T>(arr: T[]): T[]
declare function joinAsList(arr: string[]): string
declare const arraysModule: {
  arrayChunk: typeof arrayChunk
  arrayUnique: typeof arrayUnique
  joinAsList: typeof joinAsList
}
export = arraysModule
