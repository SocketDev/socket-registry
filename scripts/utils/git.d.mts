import { PathLike } from 'node:fs'

declare type DiffOptions = {
  cache?: boolean | undefined
  absolute?: boolean | undefined
  cwd?: string | undefined
  [key: string]: any
}
declare type OptionsAsSetFalse = {
  asSet?: false | undefined
  [key: string]: any
}
declare type OptionsAsSetTrue = {
  asSet: true
  [key: string]: any
}
declare const Git: {
  getModifiedFiles(options?: DiffOptions | undefined): Promise<string[]>
  getModifiedFilesSync(options?: DiffOptions | undefined): string[]
  getModifiedPackages(
    eco: string,
    options?: OptionsAsSetFalse | undefined,
  ): Promise<string[]>
  getModifiedPackages(
    eco: string,
    options: OptionsAsSetTrue,
  ): Promise<Set<string>>
  getModifiedPackagesSync(
    eco: string,
    options?: OptionsAsSetFalse | undefined,
  ): string[]
  getModifiedPackagesSync(eco: string, options: OptionsAsSetTrue): Set<string>
  getStagedFiles(options?: DiffOptions | undefined): Promise<string[]>
  getStagedFilesSync(options?: DiffOptions | undefined): string[]
  getStagedPackages(
    eco: string,
    options?: OptionsAsSetFalse | undefined,
  ): Promise<string[]>
  getStagedPackages(
    eco: string,
    options: OptionsAsSetTrue,
  ): Promise<Set<string>>
  getStagedPackagesSync(
    eco: string,
    options?: OptionsAsSetFalse | undefined,
  ): string[]
  getStagedPackagesSync(eco: string, options: OptionsAsSetTrue): Set<string>
  isModified(
    pathname: PathLike,
    options?: DiffOptions | undefined,
  ): Promise<boolean>
  isModifiedSync(pathname: PathLike, options?: DiffOptions | undefined): boolean
  isStaged(
    pathname: PathLike,
    options?: DiffOptions | undefined,
  ): Promise<boolean>
  isStagedSync(pathname: PathLike, options?: DiffOptions | undefined): boolean
}
declare namespace Git {
  export { DiffOptions, OptionsAsSetFalse, OptionsAsSetTrue }
}
export = Git
