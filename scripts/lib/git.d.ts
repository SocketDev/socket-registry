import { PathLike } from 'node:fs'

declare type DiffOptions = {
  cache?: boolean | undefined
  absolute?: boolean | undefined
  cwd?: string | undefined
  [key: string]: any
}
declare type GetPackagesOptionsAsArray = {
  asSet?: false | undefined
  [key: string]: any
}
declare type GetPackagesOptionsAsSet = {
  asSet: true
  [key: string]: any
}
declare const Git: {
  getModifiedFiles(options?: DiffOptions): Promise<string[]>
  getModifiedFilesSync(options?: DiffOptions): string[]
  getModifiedPackages(
    eco: string,
    options?: GetPackagesOptionsAsArray | undefined
  ): Promise<string[]>
  getModifiedPackages(
    eco: string,
    options: GetPackagesOptionsAsSet
  ): Promise<Set<string>>
  getModifiedPackagesSync(
    eco: string,
    options?: GetPackagesOptionsAsArray | undefined
  ): string[]
  getModifiedPackagesSync(
    eco: string,
    options: GetPackagesOptionsAsSet
  ): Set<string>
  getStagedFiles(options?: DiffOptions): Promise<string[]>
  getStagedFilesSync(options?: DiffOptions): string[]
  getStagedPackages(
    eco: string,
    options?: GetPackagesOptionsAsArray | undefined
  ): Promise<string[]>
  getStagedPackages(
    eco: string,
    options: GetPackagesOptionsAsSet
  ): Promise<Set<string>>
  getStagedPackagesSync(
    eco: string,
    options?: GetPackagesOptionsAsArray | undefined
  ): string[]
  getStagedPackagesSync(
    eco: string,
    options: GetPackagesOptionsAsSet
  ): Set<string>
  isModified(pathname: PathLike, options?: DiffOptions): Promise<boolean>
  isModifiedSync(pathname: PathLike, options?: DiffOptions): boolean
  isStaged(pathname: PathLike, options?: DiffOptions): Promise<boolean>
  isStagedSync(pathname: PathLike, options?: DiffOptions): boolean
}
declare namespace Git {
  export { DiffOptions, GetPackagesOptionsAsArray, GetPackagesOptionsAsSet }
}
export = Git
