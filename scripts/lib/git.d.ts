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
  getModifiedFiles(options?: DiffOptions): Promise<string[]>
  getModifiedFilesSync(options?: DiffOptions): string[]
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
  getStagedFiles(options?: DiffOptions): Promise<string[]>
  getStagedFilesSync(options?: DiffOptions): string[]
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
  isModified(pathname: PathLike, options?: DiffOptions): Promise<boolean>
  isModifiedSync(pathname: PathLike, options?: DiffOptions): boolean
  isStaged(pathname: PathLike, options?: DiffOptions): Promise<boolean>
  isStagedSync(pathname: PathLike, options?: DiffOptions): boolean
}
declare namespace Git {
  export { DiffOptions, OptionsAsSetFalse, OptionsAsSetTrue }
}
export = Git
