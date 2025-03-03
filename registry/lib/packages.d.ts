import NPMCliPackageJson from '@npmcli/package-json'
import {
  manifest as PacoteManifestFn,
  packument as PacotePackumentFn,
  Options as PacoteOptionsRaw,
  tarball as PacoteTarballFn
} from 'pacote'
import { CategoryString } from '../index'

declare namespace Packages {
  export class EditablePackageJson extends NPMCliPackageJson {
    content: Readonly<PackageJson>
    saveSync: () => void
  }
  export type Exports = Exclude<PackageJson['exports'], undefined>
  export type ExtractOptions = PacoteOptions & {
    dest?: string | undefined
    tmpPrefix?: string | undefined
  }
  export interface LicenseNode {
    license: string
    exception?: string | undefined
    inFile?: string | undefined
    plus?: boolean | undefined
  }
  export type NormalizedPackageJson = Omit<PackageJson, 'repository'> & {
    repository?: Exclude<PackageJson['repository'], string>
  }
  export type PackageJson = NPMCliPackageJson.Content & {
    socket?: { categories: CategoryString }
  }
  export type PacoteOptions = PacoteOptionsRaw & {
    signal?: AbortSignal | undefined
  }
  export function collectIncompatibleLicenses(
    licenseNodes: LicenseNode[]
  ): LicenseNode[]
  export function collectLicenseWarnings(licenseNodes: LicenseNode[]): string[]
  export function createPackageJson(
    sockRegPkgName: string,
    directory: string,
    options: PackageJson
  ): PackageJson
  export function extractPackage(
    pkgNameOrId: string,
    options: ExtractOptions,
    callback: (destPath: string) => Promise<any>
  ): Promise<void>
  export function fetchPackageManifest(
    pkgNameOrId: string,
    options?: PacoteOptions | undefined
  ): Promise<Awaited<ReturnType<typeof PacoteManifestFn>> | null>
  export function fetchPackagePackument(
    pkgNameOrId: string,
    options?: PacoteOptions | undefined
  ): Promise<Awaited<ReturnType<typeof PacotePackumentFn>> | null>
  export function findTypesForSubpath(
    entryExports: Exports,
    subpath: string
  ): string | undefined
  export function getReleaseTag(version: string): string
  export function getRepoUrlDetails(repoUrl: string): {
    user: string
    project: string
  }
  export function getSubpaths(entryExports: Exports): string[]
  export function isBlessedPackageName(name: any): boolean
  export function isConditionalExports(entryExports: Exports): boolean
  export function isGitHubTgzSpec(
    spec: string,
    where?: string | undefined
  ): boolean
  export function isGitHubUrlSpec(
    spec: string,
    where?: string | undefined
  ): boolean
  export function isSubpathExports(entryExports: Exports): boolean
  export function isValidPackageName(name: any): boolean
  export function normalizePackageJson(
    pkgJson: PackageJson,
    options?: { preserve?: string[] | Readonly<string[]> }
  ): NormalizedPackageJson
  export function packPackage(
    spec: string,
    options?: PacoteOptions & {
      args?: string[] | Readonly<string[]>
      binPaths?: string[] | Readonly<string[]>
      cmd?: string | undefined
      dryRun?: boolean | undefined
      env?: { [key: string]: string }
      foregroundScripts?: boolean | undefined
      ignoreScripts?: boolean | undefined
      packDestination?: string | undefined
      scriptShell?: string | undefined
      stdioString?: boolean | undefined
    }
  ): Promise<Awaited<ReturnType<typeof PacoteTarballFn>>>
  export function readPackageJson(
    filepath: string,
    options: { editable: true; preserve?: string[] | Readonly<string[]> }
  ): Promise<EditablePackageJson>
  export function readPackageJson(
    filepath: string,
    options?: { editable?: false; preserve?: string[] | Readonly<string[]> }
  ): Promise<PackageJson>
  export function readPackageJsonSync(
    filepath: string,
    options: { editable: true; preserve?: string[] | Readonly<string[]> }
  ): EditablePackageJson
  export function readPackageJsonSync(
    filepath: string,
    options?: { editable?: false; preserve?: string[] | Readonly<string[]> }
  ): PackageJson
  export function resolveEscapedScope(sockRegPkgName: string): string
  export function resolveGitHubTgzUrl(
    pkgNameOrId: string,
    where: string
  ): Promise<string>
  export function resolveOriginalPackageName(sockRegPkgName: string): string
  export function resolvePackageJsonDirname(filepath: string): string
  export function resolvePackageJsonEntryExports(
    entryExports: any
  ): Exports | undefined
  export function resolvePackageJsonPath(filepath: string): string
  export function resolvePackageLicenses(
    licenseFieldValue: string,
    where: string
  ): LicenseNode[]
  export function resolvePackageName(
    purlObj: {
      name: string
      namespace?: string | undefined
    },
    delimiter?: string | undefined
  ): string
  export function resolveRegistryPackageName(pkgName: string): string
  export function toEditablePackageJson(
    pkgJson: PackageJson,
    options: { path?: string; preserve?: string[] | Readonly<string[]> }
  ): Promise<EditablePackageJson>
  export function toEditablePackageJsonSync(
    pkgJson: PackageJson,
    options: { path?: string; preserve?: string[] | Readonly<string[]> }
  ): EditablePackageJson
  export function unescapeScope(escapedScope: string): string
}
export = Packages
