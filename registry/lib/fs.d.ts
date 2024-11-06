import { PathLike } from 'node:fs'

declare interface ReadDirOptions {
  withFileTypes?: boolean
  [key: string]: any
}
declare interface RemoveOptions {
  force?: boolean
  maxRetries?: number
  recursive?: boolean
  retryDelay?: number
  [key: string]: any
}
declare function isDirEmptySync(dirPath: PathLike): boolean
declare function isSymbolicLinkSync(filepath: PathLike): boolean
declare function readDirNames(
  dirname: PathLike,
  options?: ReadDirOptions
): Promise<string[]>
declare function readDirNamesSync(
  dirname: PathLike,
  options?: ReadDirOptions
): string[]
declare function remove(
  filepath: PathLike,
  options?: RemoveOptions
): Promise<void>
declare function removeSync(filepath: PathLike, options?: RemoveOptions): void
declare function uniqueSync(filepath: PathLike): string
declare const fs: {
  isDirEmptySync: typeof isDirEmptySync
  isSymbolicLinkSync: typeof isSymbolicLinkSync
  readDirNames: typeof readDirNames
  readDirNamesSync: typeof readDirNamesSync
  remove: typeof remove
  removeSync: typeof removeSync
  uniqueSync: typeof uniqueSync
}
export = fs
