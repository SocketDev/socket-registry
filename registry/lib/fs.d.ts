/// <reference types="node" />
import { PathLike, RmOptions } from 'node:fs'

declare interface ReadDirOptions {
  includeEmpty?: boolean
  sort?: boolean
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
declare function remove(filepath: PathLike, options?: RmOptions): Promise<void>
declare function removeSync(filepath: PathLike, options?: RmOptions): void
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
