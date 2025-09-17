/// <reference types="node" />
import type { Remap } from './objects'
import type NPMCliPackageJson from '@npmcli/package-json'
import type { Abortable } from 'node:events'
import type {
  BigIntStats,
  ObjectEncodingOptions,
  OpenMode,
  PathLike,
  PathOrFileDescriptor,
  RmOptions,
  StatSyncOptions,
  Stats,
  WriteFileOptions,
  readFile,
  readFileSync
} from 'node:fs'
import type { FileHandle } from 'node:fs/promises'

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
declare type IsDirEmptyOptions = {
  ignore?: string[] | readonly string[] | undefined
}
declare type JsonContent = NPMCliPackageJson.Content
declare type ReadFileOptions =
  | Remap<
      ObjectEncodingOptions &
        Abortable & {
          flag?: OpenMode | undefined
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
  ignore?: string[] | readonly string[] | undefined
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
  isDirSync: (filepath: PathLike) => boolean
  isDirEmptySync: (
    dirname: PathLike,
    options?: IsDirEmptyOptions | undefined
  ) => boolean
  isSymLinkSync(filepath: PathLike): boolean
  readDirNames(
    dirname: PathLike,
    options?: ReadDirOptions | undefined
  ): Promise<string[]>
  readDirNamesSync: (
    dirname: PathLike,
    options?: ReadDirOptions | undefined
  ) => string[]
  readFileBinary(
    filepath: PathLike | FileHandle,
    options?: ReadFileOptions | undefined
  ): Promise<Buffer>
  readFileUtf8(
    filepath: PathLike | FileHandle,
    options?: ReadFileOptions | undefined
  ): Promise<string>
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
  safeReadFile(
    filepath: PathLike | FileHandle,
    options?: 'utf8' | 'utf-8' | { encoding: 'utf8' | 'utf-8' } | undefined
  ): Promise<string | undefined>
  safeReadFile(
    filepath: PathLike | FileHandle,
    options?: ReadFileOptions | NodeJS.BufferEncoding | undefined
  ): Promise<Awaited<ReturnType<typeof readFile>> | undefined>
  safeReadFileSync(
    filepath: PathOrFileDescriptor,
    options?: 'utf8' | 'utf-8' | { encoding: 'utf8' | 'utf-8' } | undefined
  ): string | undefined
  safeReadFileSync(
    filepath: PathOrFileDescriptor,
    options?:
      | {
          encoding?: NodeJS.BufferEncoding | undefined
          flag?: string | undefined
        }
      | NodeJS.BufferEncoding
      | undefined
  ): ReturnType<typeof readFileSync> | undefined
  safeStatsSync(filepath: PathLike, options?: undefined): Stats | undefined
  safeStatsSync(
    filepath: PathLike,
    options?: StatSyncOptions & {
      bigint?: false | undefined
    }
  ): Stats | undefined
  safeStatsSync(
    filepath: PathLike,
    options: StatSyncOptions & {
      bigint: true
    }
  ): BigIntStats | undefined
  safeStatsSync(
    filepath: PathLike,
    options: StatSyncOptions & {
      bigint: boolean
    }
  ): Stats | BigIntStats | undefined
  safeStatsSync(
    filepath: PathLike,
    options?: StatSyncOptions
  ): Stats | BigIntStats | undefined
  uniqueSync(filepath: PathLike): string
  writeJson(
    filepath: PathLike,
    jsonContent: JsonContent,
    options?: WriteJsonOptions | undefined
  ): Promise<void>
  writeJsonSync(
    filepath: PathLike,
    jsonContent: JsonContent,
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
