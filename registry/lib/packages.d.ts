import {
  Content as NPMCliPackageJsonContent,
  PackageJson as NPMCliPackageJson
} from '@npmcli/package-json'
import {
  manifest as PacoteManifestFn,
  Options as PacoteOptionsRaw,
  tarball as PacoteTarballFn
} from 'pacote'
import { CategoryString } from '../index'

declare type Exports = Exclude<PackageJson['exports'], undefined>
declare type PackageJson = NPMCliPackageJsonContent & {
  socket?: { categories: CategoryString }
}
declare type EditablePackageJson = Omit<NPMCliPackageJson, 'content'> & {
  content: Readonly<PackageJson>
}
declare type NormalizedPackageJson = Omit<PackageJson, 'repository'> & {
  repository?: Exclude<PackageJson['repository'], string>
}
declare type PacoteOptions = PacoteOptionsRaw & {
  signal?: AbortSignal
}
declare type ExtractOptions = PacoteOptions & {
  tmpPrefix?: string
}
declare interface LicenseNode {
  license: string
  exception?: string
  inFile?: string
  plus?: boolean
}
declare function collectIncompatibleLicenses(
  licenseNodes: LicenseNode[]
): LicenseNode[]
declare function collectLicenseWarnings(licenseNodes: LicenseNode[]): string[]
declare function createPackageJson(
  regPkgName: string,
  directory: string,
  options: PackageJson
): PackageJson
declare function extractPackage(
  pkgNameOrId: string,
  options: ExtractOptions,
  callback: (tmpDirPath: string) => Promise<any>
): Promise<void>
declare function fetchPackageManifest(
  pkgNameOrId: string,
  options?: PacoteOptions
): ReturnType<typeof PacoteManifestFn>
declare function findTypesForSubpath(
  entryExports: Exports,
  subpath: string
): string | undefined
declare function getSubpaths(entryExports: Exports): string[]
declare function isConditionalExports(entryExports: Exports): boolean
declare function isSubpathExports(entryExports: Exports): boolean
declare function isValidPackageName(value: any): boolean
declare function normalizePackageJson(
  pkgJson: PackageJson,
  options?: { preserve?: string[] }
): NormalizedPackageJson
declare function packPackage(
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
declare function readPackageJson(
  filepath: string,
  options: { editable: true; preserve?: string[] }
): Promise<EditablePackageJson>
declare function readPackageJson(
  filepath: string,
  options?: { editable?: false; preserve?: string[] }
): Promise<PackageJson>
declare function readPackageJsonSync(
  filepath: string,
  options: { editable: true; preserve?: string[] }
): EditablePackageJson
declare function readPackageJsonSync(
  filepath: string,
  options?: { editable?: false; preserve?: string[] }
): PackageJson
declare function resolveEscapedScope(regPkgName: string): string
declare function resolveGitHubTgzUrl(
  pkgNameOrId: string,
  where: string
): Promise<string>
declare function resolveOriginalPackageName(regPkgName: string): string
declare function resolvePackageJsonDirname(filepath: string): string
declare function resolvePackageJsonEntryExports(
  entryExports: any
): Exports | undefined
declare function resolvePackageJsonPath(filepath: string): string
declare function resolvePackageLicenses(
  licenseFieldValue: string,
  where: string
): LicenseNode[]
declare function resolveRegistryPackageName(pkgName: string): string
declare function toEditablePackageJson(
  pkgJson: PackageJson,
  options: { path?: string; preserve?: string[] }
): Promise<EditablePackageJson>
declare function toEditablePackageJsonSync(
  pkgJson: PackageJson,
  options: { path?: string; preserve?: string[] }
): EditablePackageJson
declare function unescapeScope(escapedScope: string): string
declare const packagesModule: {
  collectIncompatibleLicenses: typeof collectIncompatibleLicenses
  collectLicenseWarnings: typeof collectLicenseWarnings
  createPackageJson: typeof createPackageJson
  extractPackage: typeof extractPackage
  fetchPackageManifest: typeof fetchPackageManifest
  findTypesForSubpath: typeof findTypesForSubpath
  getSubpaths: typeof getSubpaths
  isConditionalExports: typeof isConditionalExports
  isSubpathExports: typeof isSubpathExports
  isValidPackageName: typeof isValidPackageName
  normalizePackageJson: typeof normalizePackageJson
  packPackage: typeof packPackage
  readPackageJson: typeof readPackageJson
  readPackageJsonSync: typeof readPackageJsonSync
  resolveEscapedScope: typeof resolveEscapedScope
  resolveGitHubTgzUrl: typeof resolveGitHubTgzUrl
  resolveOriginalPackageName: typeof resolveOriginalPackageName
  resolvePackageJsonDirname: typeof resolvePackageJsonDirname
  resolvePackageJsonEntryExports: typeof resolvePackageJsonEntryExports
  resolvePackageJsonPath: typeof resolvePackageJsonPath
  resolvePackageLicenses: typeof resolvePackageLicenses
  resolveRegistryPackageName: typeof resolveRegistryPackageName
  toEditablePackageJson: typeof toEditablePackageJson
  toEditablePackageJsonSync: typeof toEditablePackageJsonSync
  unescapeScope: typeof unescapeScope
}
export = packagesModule
