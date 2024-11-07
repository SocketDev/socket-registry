import { Content as NPMCliPackageJson } from '@npmcli/package-json'
import { Options as PacoteOptionsRaw } from 'pacote'
import { CategoryString } from '../index'

declare type PackageJson = NPMCliPackageJson & {
  socket?: { categories: CategoryString }
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
): Record<string, any>
declare function extractPackage(
  pkgNameOrId: string,
  options: ExtractOptions,
  callback: (tmpDirPath: string) => Promise<any>
): Promise<void>
declare function fetchPackageManifest(
  pkgNameOrId: string,
  options?: PacoteOptions
): Promise<Record<string, any> | null>
declare function findTypesForSubpath(
  entryExports: any,
  subpath: string
): string | undefined
declare function getSubpaths(entryExports: any): string[]
declare function isConditionalExports(entryExports: any): boolean
declare function isSubpathExports(entryExports: any): boolean
declare function isValidPackageName(value: any): boolean
declare function normalizePackageJson(
  pkgJson: Record<string, any>,
  options?: Record<string, any>
): NormalizedPackageJson
declare function packPackage(
  spec: string,
  options?: Record<string, any>
): Promise<Buffer>
declare function readPackageJson(
  filepath: string,
  options?: Record<string, any>
): Promise<PackageJson>
declare function readPackageJsonSync(
  filepath: string,
  options?: Record<string, any>
): PackageJson
declare function resolveEscapedScope(regPkgName: string): string
declare function resolveGitHubTgzUrl(
  pkgNameOrId: string,
  where: string | Record<string, any>
): Promise<string>
declare function resolveOriginalPackageName(regPkgName: string): string
declare function resolvePackageJsonDirname(filepath: string): string
declare function resolvePackageJsonEntryExports(
  entryExports: any
): Record<string, any> | undefined
declare function resolvePackageJsonPath(filepath: string): string
declare function resolvePackageLicenses(
  licenseFieldValue: string,
  where: string
): LicenseNode[]
declare function resolveRegistryPackageName(pkgName: string): string
declare function toEditablePackageJson(
  pkgJson: Record<string, any>,
  options: Record<string, any>
): Promise<any>
declare function toEditablePackageJsonSync(
  pkgJson: Record<string, any>,
  options: Record<string, any>
): any
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
