import NPMCliPackageJson from '@npmcli/package-json'
import {
  manifest as PacoteManifestFn,
  Options as PacoteOptionsRaw,
  tarball as PacoteTarballFn
} from 'pacote'
import { CategoryString } from '../index'

declare namespace PackagesModule {
  export type Exports = Exclude<PackageJson['exports'], undefined>
  export type PackageJson = NPMCliPackageJson.Content & {
    socket?: { categories: CategoryString }
  }
  export class EditablePackageJson extends NPMCliPackageJson {
    content: Readonly<PackageJson>
    saveSync: () => void
  }
  export type NormalizedPackageJson = Omit<PackageJson, 'repository'> & {
    repository?: Exclude<PackageJson['repository'], string>
  }
  export type PacoteOptions = PacoteOptionsRaw & {
    signal?: AbortSignal
  }
  export type ExtractOptions = PacoteOptions & {
    tmpPrefix?: string
  }
  export interface LicenseNode {
    license: string
    exception?: string
    inFile?: string
    plus?: boolean
  }
  export function collectIncompatibleLicenses(
    licenseNodes: LicenseNode[]
  ): LicenseNode[]
  export function collectLicenseWarnings(licenseNodes: LicenseNode[]): string[]
  export function createPackageJson(
    regPkgName: string,
    directory: string,
    options: PackageJson
  ): PackageJson
  export function extractPackage(
    pkgNameOrId: string,
    options: ExtractOptions,
    callback: (tmpDirPath: string) => Promise<any>
  ): Promise<void>
  export function fetchPackageManifest(
    pkgNameOrId: string,
    options?: PacoteOptions
  ): ReturnType<typeof PacoteManifestFn>
  export function findTypesForSubpath(
    entryExports: Exports,
    subpath: string
  ): string | undefined
  export function getSubpaths(entryExports: Exports): string[]
  export function isConditionalExports(entryExports: Exports): boolean
  export function isSubpathExports(entryExports: Exports): boolean
  export function isValidPackageName(value: any): boolean
  export function normalizePackageJson(
    pkgJson: PackageJson,
    options?: { preserve?: string[] }
  ): NormalizedPackageJson
  export function packPackage(
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
  ): Awaited<ReturnType<typeof PacoteTarballFn>>
  export function readPackageJson(
    filepath: string,
    options: { editable: true; preserve?: string[] }
  ): Promise<EditablePackageJson>
  export function readPackageJson(
    filepath: string,
    options?: { editable?: false; preserve?: string[] }
  ): Promise<PackageJson>
  export function readPackageJsonSync(
    filepath: string,
    options: { editable: true; preserve?: string[] }
  ): EditablePackageJson
  export function readPackageJsonSync(
    filepath: string,
    options?: { editable?: false; preserve?: string[] }
  ): PackageJson
  export function resolveEscapedScope(regPkgName: string): string
  export function resolveGitHubTgzUrl(
    pkgNameOrId: string,
    where: string
  ): Promise<string>
  export function resolveOriginalPackageName(regPkgName: string): string
  export function resolvePackageJsonDirname(filepath: string): string
  export function resolvePackageJsonEntryExports(
    entryExports: any
  ): Exports | undefined
  export function resolvePackageJsonPath(filepath: string): string
  export function resolvePackageLicenses(
    licenseFieldValue: string,
    where: string
  ): LicenseNode[]
  export function resolveRegistryPackageName(pkgName: string): string
  export function toEditablePackageJson(
    pkgJson: PackageJson,
    options: { path?: string; preserve?: string[] }
  ): Promise<EditablePackageJson>
  export function toEditablePackageJsonSync(
    pkgJson: PackageJson,
    options: { path?: string; preserve?: string[] }
  ): EditablePackageJson
  export function unescapeScope(escapedScope: string): string
}
declare const packagesModule: typeof PackagesModule
export = packagesModule
