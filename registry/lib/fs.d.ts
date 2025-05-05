/// <reference types="node" />
import {
  ObjectEncodingOptions,
  PathLike,
  RmOptions,
  WriteFileOptions
} from 'node:fs'

import NPMCliPackageJson from '@npmcli/package-json'

import { Remap } from './objects'

declare type BufferEncoding =
  | 'ascii'
  | 'binary'
  | 'base64'
  | 'base64url'
  | 'hex'
  | 'latin1'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'utf-16le'
  | 'ucs2'
  | 'ucs-2'
declare type JsonContent = NPMCliPackageJson.Content
declare type ReadFileOptions =
  | Remap<
      ObjectEncodingOptions & {
        flag?: string | undefined
      }
    >
  | BufferEncoding
  | null
declare type ReadJsonOptions = Remap<
  ReadFileOptions & {
    throws?: boolean | undefined
    reviver?: Parameters<typeof JSON.parse>[1]
  }
>
declare type ReadDirOptions = {
  includeEmpty?: boolean | undefined
  sort?: boolean | undefined
}
declare type WriteJsonOptions = Remap<
  WriteFileOptions & {
    EOL?: string | undefined
    finalEOL?: boolean | undefined
    replacer?: Parameters<typeof JSON.stringify>[1]
    spaces?: Parameters<typeof JSON.stringify>[2]
  }
>
declare const Fs: {
  isDirEmptySync: (dirname: string) => boolean
  isSymbolicLinkSync(filepath: PathLike): boolean
  readDirNames(dirname: PathLike, options?: ReadDirOptions): Promise<string[]>
  readDirNamesSync: (
    dirname: string,
    options?: {
      includeEmpty?: boolean | undefined
      sort?: boolean | undefined
    }
  ) => string[]
  readJson(
    filepath: PathLike,
    options?: ReadJsonOptions | undefined
  ): Promise<JsonContent>
  readJsonSync(
    filepath: PathLike,
    options?: ReadJsonOptions | undefined
  ): JsonContent
  remove(filepath: PathLike, options?: RmOptions): Promise<void>
  removeSync(filepath: PathLike, options?: RmOptions): void
  uniqueSync(filepath: PathLike): string
  writeJson(
    filepath: PathLike,
    json: JsonContent,
    options?: WriteJsonOptions | undefined
  ): Promise<void>
  writeJsonSync(
    filepath: PathLike,
    json: JsonContent,
    options?: WriteJsonOptions | undefined
  ): void
}
declare namespace Fs {
  export {
    BufferEncoding,
    JsonContent,
    ReadFileOptions,
    ReadJsonOptions,
    ReadDirOptions,
    WriteJsonOptions
  }
}
export = Fs
