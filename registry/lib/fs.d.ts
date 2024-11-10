/// <reference types="node" />
import {
  ObjectEncodingOptions,
  PathLike,
  RmOptions,
  WriteFileOptions
} from 'node:fs'
import NPMCliPackageJson from '@npmcli/package-json'

declare type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'utf-16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex'
declare type ReadFileOptions =
  | (ObjectEncodingOptions & {
      flag?: string | undefined
    })
  | BufferEncoding
  | null
declare type ReadJsonOptions = ReadFileOptions & {
  throws?: boolean
  reviver?: Parameters<typeof JSON.parse>[1]
}
declare interface ReadDirOptions {
  includeEmpty?: boolean
  sort?: boolean
}
declare type WriteJsonOptions = WriteFileOptions & {
  EOL?: string
  finalEOL?: boolean
  replacer?: Parameters<typeof JSON.stringify>[1]
  spaces?: Parameters<typeof JSON.stringify>[2]
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
declare function readJson(
  filepath: PathLike,
  options?: ReadJsonOptions
): Promise<NPMCliPackageJson.Content>
declare function readJsonSync(
  filepath: PathLike,
  options?: ReadJsonOptions
): NPMCliPackageJson.Content
declare function remove(filepath: PathLike, options?: RmOptions): Promise<void>
declare function removeSync(filepath: PathLike, options?: RmOptions): void
declare function uniqueSync(filepath: PathLike): string
declare function writeJson(
  filepath: PathLike,
  json: NPMCliPackageJson.Content,
  options?: WriteJsonOptions
): Promise<void>
declare function writeJsonSync(
  filepath: PathLike,
  json: NPMCliPackageJson.Content,
  options?: WriteJsonOptions
): void
declare const fs: {
  isDirEmptySync: typeof isDirEmptySync
  isSymbolicLinkSync: typeof isSymbolicLinkSync
  readDirNames: typeof readDirNames
  readDirNamesSync: typeof readDirNamesSync
  readJson: typeof readJson
  readJsonSync: typeof readJsonSync
  remove: typeof remove
  removeSync: typeof removeSync
  uniqueSync: typeof uniqueSync
  writeJson: typeof writeJson
  writeJsonSync: typeof writeJsonSync
}
export = fs
