import type { Content as PackageJsonContent } from '@npmcli/package-json'

declare interface PackageJsonOptions {
  dependencies?: Record<string, string>
  description?: string
  engines?: Record<string, string>
  exports?: Record<string, any>
  files?: string[]
  keywords?: string[]
  main?: string
  overrides?: Record<string, any>
  resolutions?: Record<string, any>
  sideEffects?: boolean
  socket?: Record<string, any>
  type?: string
  version?: string
}
declare interface ExtractOptions {
  tmpPrefix?: string
  [key: string]: any
}
declare interface LicenseNode {
  license: string
  plus?: boolean
  exception?: string
  inFile?: string
}
declare function collectIncompatibleLicenses(
  licenseNodes: LicenseNode[]
): LicenseNode[]
declare function collectLicenseWarnings(licenseNodes: LicenseNode[]): string[]
declare function createPackageJson(
  regPkgName: string,
  directory: string,
  options: PackageJsonOptions
): Record<string, any>
declare function extractPackage(
  pkgNameOrId: string,
  options: ExtractOptions,
  callback: (tmpDirPath: string) => Promise<void>
): Promise<void>
declare function fetchPackageManifest(
  pkgNameOrId: string,
  options?: Record<string, any>
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
): Record<string, any>
declare function packPackage(
  spec: string,
  options?: Record<string, any>
): Promise<Buffer>
declare function readPackageJson(
  filepath: string,
  options?: Record<string, any>
): Promise<PackageJsonContent>
declare function readPackageJsonSync(
  filepath: string,
  options?: Record<string, any>
): PackageJsonContent
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
declare function visitLicenses(ast: any, visitor: Record<string, any>): void
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
  visitLicenses: typeof visitLicenses
}
export = packagesModule
