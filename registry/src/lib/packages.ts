/**
 * @fileoverview Package registry management with Socket.dev specific utilities.
 * Provides npm package analysis, dependency resolution, and registry operations.
 */

import {
  getEditablePackageJsonClass,
  pkgJsonToEditable,
  toEditablePackageJson,
  toEditablePackageJsonSync,
} from './packages/editable'
import {
  findTypesForSubpath,
  getExportFilePaths,
  getSubpaths,
  isConditionalExports,
  isSubpathExports,
  resolvePackageJsonEntryExports,
} from './packages/exports'
import {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  createAstNode,
  createBinaryOperationNode,
  createLicenseNode,
  parseSpdxExp,
  resolvePackageLicenses,
  visitLicenses,
} from './packages/licenses'
import {
  createPackageJson,
  fetchPackageManifest,
  fetchPackagePackument,
} from './packages/manifest'
import {
  normalizePackageJson,
  resolveEscapedScope,
  resolveOriginalPackageName,
  unescapeScope,
} from './packages/normalize'
import {
  extractPackage,
  findPackageExtensions,
  getReleaseTag,
  packPackage,
  readPackageJson,
  readPackageJsonSync,
  resolveGitHubTgzUrl,
  resolvePackageName,
  resolveRegistryPackageName,
} from './packages/operations'
import {
  resolvePackageJsonDirname,
  resolvePackageJsonPath,
} from './packages/paths'
import {
  fetchPackageProvenance,
  getProvenanceDetails,
} from './packages/provenance'
import {
  getRepoUrlDetails,
  gitHubTagRefUrl,
  gitHubTgzUrl,
  isGitHubTgzSpec,
  isGitHubUrlSpec,
} from './packages/specs'
import {
  isBlessedPackageName,
  isRegistryFetcherType,
  isValidPackageName,
} from './packages/validation'

import type { CategoryString } from '../index'

// Type for package.json exports field.
type PackageExports = {
  [path: string]: unknown
}

export type PackageJson = {
  [key: string]: unknown
  name?: string | undefined
  version?: string | undefined
  dependencies?: Record<string, string> | undefined
  devDependencies?: Record<string, string> | undefined
  peerDependencies?: Record<string, string> | undefined
  optionalDependencies?: Record<string, string> | undefined
  overrides?: Record<string, string> | undefined
  resolutions?: Record<string, string> | undefined
  exports?: PackageExports | string | string[] | undefined
  socket?: { categories?: CategoryString } | undefined
}

export type SaveOptions = {
  ignoreWhitespace?: boolean | undefined
  sort?: boolean | undefined
}

export type EditablePackageJsonOptions = {
  normalize?: boolean | undefined
  path?: string | undefined
  preserve?: string[] | readonly string[] | undefined
  create?: boolean | undefined
  data?: PackageJson | undefined
}

export type ExtractOptions = {
  dest?: string | undefined
  tmpPrefix?: string | undefined
  signal?: AbortSignal | undefined
  packumentCache?: Map<string, unknown> | undefined
  preferOffline?: boolean | undefined
}

export type NormalizeOptions = {
  preserve?: string[] | readonly string[] | undefined
}

export type ReadPackageJsonOptions = NormalizeOptions & {
  editable?: boolean | undefined
  normalize?: boolean | undefined
  throws?: boolean | undefined
}

export type ProvenanceOptions = {
  signal?: AbortSignal | undefined
  timeout?: number | undefined
}

export type LicenseNode = {
  license: string
  exception?: string | undefined
  inFile?: string | undefined
  plus?: boolean | undefined
}

export type PacoteOptions = {
  signal?: AbortSignal | undefined
  packumentCache?: Map<string, any> | undefined
  preferOffline?: boolean | undefined
  fullMetadata?: boolean | undefined
}

export type {
  InternalAstNode,
  InternalBinaryOperationNode,
  InternalLicenseNode,
  LicenseVisitor,
  SpdxAstNode,
  SpdxBinaryOperationNode,
  SpdxLicenseNode,
} from './packages/licenses'

export {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  createAstNode,
  createBinaryOperationNode,
  createLicenseNode,
  createPackageJson,
  extractPackage,
  fetchPackageManifest,
  fetchPackagePackument,
  fetchPackageProvenance,
  findPackageExtensions,
  findTypesForSubpath,
  getEditablePackageJsonClass,
  getExportFilePaths,
  getProvenanceDetails,
  getReleaseTag,
  getRepoUrlDetails,
  getSubpaths,
  gitHubTagRefUrl,
  gitHubTgzUrl,
  isBlessedPackageName,
  isConditionalExports,
  isGitHubTgzSpec,
  isGitHubUrlSpec,
  isRegistryFetcherType,
  isSubpathExports,
  isValidPackageName,
  normalizePackageJson,
  packPackage,
  parseSpdxExp,
  pkgJsonToEditable,
  readPackageJson,
  readPackageJsonSync,
  resolveEscapedScope,
  resolveGitHubTgzUrl,
  resolveOriginalPackageName,
  resolvePackageName,
  resolvePackageJsonDirname,
  resolvePackageJsonPath,
  resolvePackageJsonEntryExports,
  resolvePackageLicenses,
  resolveRegistryPackageName,
  toEditablePackageJson,
  toEditablePackageJsonSync,
  unescapeScope,
  visitLicenses,
}
