import NPMCliPackageJson from '@npmcli/package-json'
import {
  manifest as PacoteManifestFn,
  packument as PacotePackumentFn,
  Options as PacoteOptionsRaw,
  tarball as PacoteTarballFn
} from 'pacote'
import { CategoryString } from '../index'

declare class EditablePackageJson extends NPMCliPackageJson {
  content: Readonly<PackageJson>
  saveSync: () => void
}
declare type Exports = Exclude<PackageJson['exports'], undefined>
declare type ExtractOptions = PacoteOptions & {
  dest?: string
  tmpPrefix?: string
}
declare interface LicenseNode {
  license: string
  exception?: string
  inFile?: string
  plus?: boolean
}
declare type NormalizedPackageJson = Omit<PackageJson, 'repository'> & {
  repository?: Exclude<PackageJson['repository'], string>
}
declare type PackageJson = NPMCliPackageJson.Content & {
  socket?: { categories: CategoryString }
}
declare type PacoteOptions = PacoteOptionsRaw & {
  signal?: AbortSignal
}
declare const Packages: {
  collectIncompatibleLicenses(licenseNodes: LicenseNode[]): LicenseNode[]
  collectLicenseWarnings(licenseNodes: LicenseNode[]): string[]
  createPackageJson(
    sockRegPkgName: string,
    directory: string,
    options: PackageJson
  ): PackageJson
  extractPackage(
    pkgNameOrId: string,
    options: ExtractOptions,
    callback: (destPath: string) => Promise<any>
  ): Promise<void>
  fetchPackageManifest(
    pkgNameOrId: string,
    options?: PacoteOptions
  ): Promise<Awaited<ReturnType<typeof PacoteManifestFn>> | null>
  fetchPackagePackument(
    pkgNameOrId: string,
    options?: PacoteOptions
  ): Promise<Awaited<ReturnType<typeof PacotePackumentFn>> | null>
  findTypesForSubpath(
    entryExports: Exports,
    subpath: string
  ): string | undefined
  getSubpaths(entryExports: Exports): string[]
  isBlessedPackageName(name: any): boolean
  isConditionalExports(entryExports: Exports): boolean
  isGitHubTgzSpec(spec: string, where?: string | undefined): boolean
  isGitHubUrlSpec(spec: string, where?: string | undefined): boolean
  isSubpathExports(entryExports: Exports): boolean
  isValidPackageName(name: any): boolean
  normalizePackageJson(
    pkgJson: PackageJson,
    options?: { preserve?: string[] }
  ): NormalizedPackageJson
  packPackage(
    spec: string,
    options?: PacoteOptions & {
      args?: string[]
      binPaths?: string[]
      cmd?: string
      dryRun?: boolean
      env?: { [key: string]: string }
      foregroundScripts?: boolean
      ignoreScripts?: boolean
      packDestination?: string
      scriptShell?: string
      stdioString?: boolean
    }
  ): Promise<Awaited<ReturnType<typeof PacoteTarballFn>>>
  readPackageJson(
    filepath: string,
    options: { editable: true; preserve?: string[] }
  ): Promise<EditablePackageJson>
  readPackageJson(
    filepath: string,
    options?: { editable?: false; preserve?: string[] }
  ): Promise<PackageJson>
  readPackageJsonSync(
    filepath: string,
    options: { editable: true; preserve?: string[] }
  ): EditablePackageJson
  readPackageJsonSync(
    filepath: string,
    options?: { editable?: false; preserve?: string[] }
  ): PackageJson
  resolveEscapedScope(sockRegPkgName: string): string
  resolveGitHubTgzUrl(pkgNameOrId: string, where: string): Promise<string>
  resolveOriginalPackageName(sockRegPkgName: string): string
  resolvePackageJsonDirname(filepath: string): string
  resolvePackageJsonEntryExports(entryExports: any): Exports | undefined
  resolvePackageJsonPath(filepath: string): string
  resolvePackageLicenses(
    licenseFieldValue: string,
    where: string
  ): LicenseNode[]
  resolvePackageName(
    purlObj: {
      name: string
      namespace?: string | undefined
    },
    delimiter?: string | undefined
  ): string
  resolveRegistryPackageName(pkgName: string): string
  toEditablePackageJson(
    pkgJson: PackageJson,
    options: { path?: string; preserve?: string[] }
  ): Promise<EditablePackageJson>
  toEditablePackageJsonSync(
    pkgJson: PackageJson,
    options: { path?: string; preserve?: string[] }
  ): EditablePackageJson
  unescapeScope(escapedScope: string): string
}
declare namespace Packages {
  export type EditablePackageJson = typeof EditablePackageJson
  export {
    Exports,
    ExtractOptions,
    LicenseNode,
    NormalizedPackageJson,
    PackageJson,
    PacoteOptions
  }
}
export = Packages
