import { PathLike } from 'node:fs'

declare interface DiffOptions {
  cache?: boolean
  absolute?: boolean
  cwd?: string
  [key: string]: any
}
declare interface GetPackagesOptionsAsArray {
  asSet?: false
  [key: string]: any
}
declare interface GetPackagesOptionsAsSet {
  asSet: true
  [key: string]: any
}
declare function getModifiedFiles(options?: DiffOptions): Promise<string[]>
declare function getModifiedFilesSync(options?: DiffOptions): string[]
declare function getModifiedPackages(
  eco: string,
  options?: GetPackagesOptionsAsArray
): Promise<string[]>
declare function getModifiedPackages(
  eco: string,
  options: GetPackagesOptionsAsSet
): Promise<Set<string>>
declare function getModifiedPackagesSync(
  eco: string,
  options?: GetPackagesOptionsAsArray
): string[]
declare function getModifiedPackagesSync(
  eco: string,
  options: GetPackagesOptionsAsSet
): Set<string>
declare function getStagedFiles(options?: DiffOptions): Promise<string[]>
declare function getStagedFilesSync(options?: DiffOptions): string[]
declare function getStagedPackages(
  eco: string,
  options?: GetPackagesOptionsAsArray
): Promise<string[]>
declare function getStagedPackages(
  eco: string,
  options: GetPackagesOptionsAsSet
): Promise<Set<string>>
declare function getStagedPackagesSync(
  eco: string,
  options?: GetPackagesOptionsAsArray
): string[]
declare function getStagedPackagesSync(
  eco: string,
  options: GetPackagesOptionsAsSet
): Set<string>
declare function isModified(
  pathname: PathLike,
  options?: DiffOptions
): Promise<boolean>
declare function isModifiedSync(
  pathname: PathLike,
  options?: DiffOptions
): boolean
declare function isStaged(
  pathname: PathLike,
  options?: DiffOptions
): Promise<boolean>
declare function isStagedSync(
  pathname: PathLike,
  options?: DiffOptions
): boolean
declare const gitModule: {
  getModifiedFiles: typeof getModifiedFiles
  getModifiedFilesSync: typeof getModifiedFilesSync
  getModifiedPackages: typeof getModifiedPackages
  getModifiedPackagesSync: typeof getModifiedPackagesSync
  getStagedFiles: typeof getStagedFiles
  getStagedFilesSync: typeof getStagedFilesSync
  getStagedPackages: typeof getStagedPackages
  getStagedPackagesSync: typeof getStagedPackagesSync
  isModified: typeof isModified
  isModifiedSync: typeof isModifiedSync
  isStaged: typeof isStaged
  isStagedSync: typeof isStagedSync
}
export = gitModule
