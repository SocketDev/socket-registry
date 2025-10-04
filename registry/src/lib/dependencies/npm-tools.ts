/** @fileoverview NPM tool dependency registry. */

export interface NpmPackageArg {
  (
    spec: string,
    where?: string,
  ): {
    escapedName?: string
    fetchSpec?: string
    gitCommittish?: string
    hosted?: {
      project: string
      user: string
    }
    name?: string
    raw?: string
    rawSpec?: string
    saveSpec?: string
    type: string
  }
}

export interface PackageJson {
  content: unknown
  load(
    where: string,
    opts?: { create?: boolean; normalize?: boolean },
  ): Promise<unknown>
  normalize(): void
  save(): Promise<void>
  update(content: unknown): void
}

export interface PackageJsonConstructor {
  new (): PackageJson
  load(
    where: string,
    opts?: { create?: boolean; normalize?: boolean },
  ): Promise<PackageJson>
}

export interface ReadPackageJson {
  (where: string): Promise<unknown>
}

export interface SortPackageJson {
  (data: unknown): unknown
}

export interface NormalizePackageData {
  (data: unknown, warn?: (msg: string) => void, strict?: boolean): void
}

export interface Libnpmpack {
  (spec: string, opts?: unknown): Promise<Buffer>
}

export interface Pacote {
  extract(spec: string, dest: string, opts?: unknown): Promise<unknown>
  manifest(spec: string, opts?: unknown): Promise<unknown>
  packument(spec: string, opts?: unknown): Promise<unknown>
  tarball: {
    stream(
      spec: string,
      streamHandler: (stream: unknown) => void,
    ): Promise<void>
  }
}

export interface MakeFetchHappen {
  (
    url: string,
    options?: unknown,
  ): Promise<{
    body: unknown
    headers: Map<string, string>
    json(): Promise<unknown>
    ok: boolean
    status: number
    statusText: string
    text(): Promise<string>
  }>
}

export interface PackageUrl {
  fromString(purl: string): {
    name: string
    namespace?: string
    qualifiers?: Record<string, string>
    subpath?: string
    type: string
    version?: string
  }
  toString(components: {
    name: string
    namespace?: string
    qualifiers?: Record<string, string>
    subpath?: string
    type: string
    version?: string
  }): string
}

interface NpmToolsDependencies {
  libnpmpack: Libnpmpack | undefined
  makeFetchHappen: MakeFetchHappen | undefined
  normalizePackageData: NormalizePackageData | undefined
  npmPackageArg: NpmPackageArg | undefined
  packageJson: PackageJsonConstructor | undefined
  packageUrl: PackageUrl | undefined
  pacote: Pacote | undefined
  readPackageJson: ReadPackageJson | undefined
  sortPackageJson: SortPackageJson | undefined
}

const dependencies: NpmToolsDependencies = {
  libnpmpack: undefined,
  makeFetchHappen: undefined,
  normalizePackageData: undefined,
  npmPackageArg: undefined,
  packageJson: undefined,
  packageUrl: undefined,
  pacote: undefined,
  readPackageJson: undefined,
  sortPackageJson: undefined,
}

/**
 * Get libnpmpack instance, lazily loading if not set.
 */
export function getLibnpmpack(): Libnpmpack {
  if (!dependencies.libnpmpack) {
    dependencies.libnpmpack = require('../../external/libnpmpack')
  }
  return dependencies.libnpmpack!
}

/**
 * Get make-fetch-happen instance, lazily loading if not set.
 */
export function getMakeFetchHappen(): MakeFetchHappen {
  if (!dependencies.makeFetchHappen) {
    dependencies.makeFetchHappen = require('../../external/make-fetch-happen')
  }
  return dependencies.makeFetchHappen!
}

/**
 * Get normalize-package-data instance, lazily loading if not set.
 */
export function getNormalizePackageData(): NormalizePackageData {
  if (!dependencies.normalizePackageData) {
    dependencies.normalizePackageData = require('../../external/normalize-package-data')
  }
  return dependencies.normalizePackageData!
}

/**
 * Get npm-package-arg instance, lazily loading if not set.
 */
export function getNpmPackageArg(): NpmPackageArg {
  if (!dependencies.npmPackageArg) {
    dependencies.npmPackageArg = require('../../external/npm-package-arg')
  }
  return dependencies.npmPackageArg!
}

/**
 * Get package-json instance, lazily loading if not set.
 */
export function getPackageJson(): PackageJsonConstructor {
  if (!dependencies.packageJson) {
    dependencies.packageJson = require('../../external/@npmcli/package-json')
  }
  return dependencies.packageJson!
}

/**
 * Get packageurl-js instance, lazily loading if not set.
 */
export function getPackageUrl(): PackageUrl {
  if (!dependencies.packageUrl) {
    const purlExport = require('../../external/@socketregistry/packageurl-js')
    dependencies.packageUrl = purlExport.default || purlExport
  }
  return dependencies.packageUrl!
}

/**
 * Get pacote instance, lazily loading if not set.
 */
export function getPacote(): Pacote {
  if (!dependencies.pacote) {
    dependencies.pacote = require('../../external/pacote')
  }
  return dependencies.pacote!
}

/**
 * Get read-package-json instance, lazily loading if not set.
 */
export function getReadPackageJson(): ReadPackageJson {
  if (!dependencies.readPackageJson) {
    const readExport = require('../../external/@npmcli/package-json/lib/read-package')
    dependencies.readPackageJson = readExport.readPackage
  }
  return dependencies.readPackageJson!
}

/**
 * Get sort-package-json instance, lazily loading if not set.
 */
export function getSortPackageJson(): SortPackageJson {
  if (!dependencies.sortPackageJson) {
    const sortExport = require('../../external/@npmcli/package-json/lib/sort')
    dependencies.sortPackageJson = sortExport.packageSort
  }
  return dependencies.sortPackageJson!
}

/**
 * Set libnpmpack instance (useful for testing).
 */
export function setLibnpmpack(libnpmpack: Libnpmpack): void {
  dependencies.libnpmpack = libnpmpack
}

/**
 * Set make-fetch-happen instance (useful for testing).
 */
export function setMakeFetchHappen(makeFetchHappen: MakeFetchHappen): void {
  dependencies.makeFetchHappen = makeFetchHappen
}

/**
 * Set normalize-package-data instance (useful for testing).
 */
export function setNormalizePackageData(
  normalizePackageData: NormalizePackageData,
): void {
  dependencies.normalizePackageData = normalizePackageData
}

/**
 * Set npm-package-arg instance (useful for testing).
 */
export function setNpmPackageArg(npmPackageArg: NpmPackageArg): void {
  dependencies.npmPackageArg = npmPackageArg
}

/**
 * Set package-json instance (useful for testing).
 */
export function setPackageJson(packageJson: PackageJsonConstructor): void {
  dependencies.packageJson = packageJson
}

/**
 * Set packageurl-js instance (useful for testing).
 */
export function setPackageUrl(packageUrl: PackageUrl): void {
  dependencies.packageUrl = packageUrl
}

/**
 * Set pacote instance (useful for testing).
 */
export function setPacote(pacote: Pacote): void {
  dependencies.pacote = pacote
}

/**
 * Set read-package-json instance (useful for testing).
 */
export function setReadPackageJson(readPackageJson: ReadPackageJson): void {
  dependencies.readPackageJson = readPackageJson
}

/**
 * Set sort-package-json instance (useful for testing).
 */
export function setSortPackageJson(sortPackageJson: SortPackageJson): void {
  dependencies.sortPackageJson = sortPackageJson
}

/**
 * Reset all NPM tool dependencies to undefined (forces reload on next access).
 */
export function resetNpmToolsDependencies(): void {
  dependencies.libnpmpack = undefined
  dependencies.makeFetchHappen = undefined
  dependencies.normalizePackageData = undefined
  dependencies.npmPackageArg = undefined
  dependencies.packageJson = undefined
  dependencies.packageUrl = undefined
  dependencies.pacote = undefined
  dependencies.readPackageJson = undefined
  dependencies.sortPackageJson = undefined
}
