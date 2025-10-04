/**
 * @fileoverview Package operations including extraction, packing, and I/O.
 */

import REGISTRY_SCOPE_DELIMITER from '../constants/REGISTRY_SCOPE_DELIMITER'
import abortSignal from '../constants/abort-signal'
import packageExtensions from '../constants/package-extensions'
import packumentCache from '../constants/packument-cache'
import pacoteCachePath from '../constants/pacote-cache-path'
import { readJson, readJsonSync } from '../fs'
import { isObjectObject, merge } from '../objects'
import { normalizePackageJson } from './normalize'
import { resolvePackageJsonPath } from './paths'
import {
  getRepoUrlDetails,
  gitHubTagRefUrl,
  gitHubTgzUrl,
  isGitHubTgzSpec,
  isGitHubUrlSpec,
} from './specs'

import type {
  ExtractOptions,
  NormalizeOptions,
  PackageJson,
  PacoteOptions,
  ReadPackageJsonOptions,
} from '../packages'

let _cacache: typeof import('../../external/cacache') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getCacache() {
  if (_cacache === undefined) {
    _cacache = /*@__PURE__*/ require('../../external/cacache')
  }
  return _cacache!
}

// Type for make-fetch-happen fetcher function.
type MakeFetchHappenFetcher = ((
  url: string,
  opts?: any,
) => Promise<Response>) & {
  defaults: (opts: any) => MakeFetchHappenFetcher
  delete: (url: string, opts?: any) => Promise<boolean>
}

let _fetcher: MakeFetchHappenFetcher | undefined
/*@__NO_SIDE_EFFECTS__*/
function getFetcher() {
  if (_fetcher === undefined) {
    const makeFetchHappen =
      /*@__PURE__*/ require('../../external/make-fetch-happen')
    _fetcher = makeFetchHappen.defaults({
      cachePath: pacoteCachePath,
      // Prefer-offline: Staleness checks for cached data will be bypassed, but
      // missing data will be requested from the server.
      // https://github.com/npm/make-fetch-happen?tab=readme-ov-file#--optscache
      cache: 'force-cache',
    })
  }
  return _fetcher!
}

let _npmPackageArg: typeof import('npm-package-arg') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getNpmPackageArg() {
  if (_npmPackageArg === undefined) {
    _npmPackageArg = /*@__PURE__*/ require('../../external/npm-package-arg')
  }
  return _npmPackageArg!
}

let _pack: typeof import('../../external/libnpmpack') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getPack() {
  if (_pack === undefined) {
    _pack = /*@__PURE__*/ require('../../external/libnpmpack')
  }
  return _pack!
}

let _PackageURL:
  | typeof import('@socketregistry/packageurl-js').PackageURL
  | undefined
/*@__NO_SIDE_EFFECTS__*/
function getPackageURL() {
  if (_PackageURL === undefined) {
    // The 'packageurl-js' package is browser safe.
    const packageUrlJs =
      /*@__PURE__*/ require('../../external/@socketregistry/packageurl-js')
    _PackageURL = packageUrlJs.PackageURL
  }
  return _PackageURL!
}

let _pacote: typeof import('pacote') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getPacote() {
  if (_pacote === undefined) {
    _pacote = /*@__PURE__*/ require('../../external/pacote')
  }
  return _pacote!
}

let _semver: typeof import('semver') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getSemver() {
  if (_semver === undefined) {
    // The 'semver' package is browser safe.
    _semver = /*@__PURE__*/ require('../../external/semver')
  }
  return _semver!
}

/**
 * Extract a package to a destination directory.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function extractPackage(
  pkgNameOrId: string,
  options?: ExtractOptions,
  callback?: (destPath: string) => Promise<any>,
): Promise<void> {
  if (arguments.length === 2 && typeof options === 'function') {
    callback = options
    options = undefined
  }
  const { dest, tmpPrefix, ...extractOptions_ } = {
    __proto__: null,
    ...options,
  } as ExtractOptions
  const extractOptions = {
    packumentCache,
    preferOffline: true,
    ...extractOptions_,
  }
  const pacote = getPacote()
  if (typeof dest === 'string') {
    await pacote.extract(pkgNameOrId, dest, extractOptions)
    if (typeof callback === 'function') {
      await callback(dest)
    }
  } else {
    // The DefinitelyTyped types for cacache.tmp.withTmp are incorrect.
    // It DOES returns a promise.
    const cacache = getCacache()
    await cacache.tmp.withTmp(
      pacoteCachePath,
      { tmpPrefix },
      async (tmpDirPath: string) => {
        await pacote.extract(pkgNameOrId, tmpDirPath, extractOptions)
        if (typeof callback === 'function') {
          await callback(tmpDirPath)
        }
      },
    )
  }
}

/**
 * Find package extensions for a given package.
 */
/*@__NO_SIDE_EFFECTS__*/
export function findPackageExtensions(pkgName: string, pkgVer: string): any {
  let result
  for (const entry of packageExtensions) {
    const selector = String(entry[0])
    const ext = entry[1]
    const lastAtSignIndex = selector.lastIndexOf('@')
    const name = selector.slice(0, lastAtSignIndex)
    if (pkgName === name) {
      const semver = getSemver()
      const range = selector.slice(lastAtSignIndex + 1)
      if (semver.satisfies(pkgVer, range)) {
        if (result === undefined) {
          result = {}
        }
        if (typeof ext === 'object' && ext !== null) {
          merge(result, ext)
        }
      }
    }
  }
  return result
}

/**
 * Get the release tag for a version.
 */
/*@__NO_SIDE_EFFECTS__*/
export function getReleaseTag(spec: string): string {
  if (!spec) {
    return ''
  }
  // Handle scoped packages like @scope/package vs @scope/package@tag.
  let atIndex = -1
  if (spec.startsWith('@')) {
    // Find the second @ for scoped packages.
    atIndex = spec.indexOf('@', 1)
  } else {
    // Find the first @ for unscoped packages.
    atIndex = spec.indexOf('@')
  }
  if (atIndex !== -1) {
    return spec.slice(atIndex + 1)
  }
  return ''
}

/**
 * Pack a package tarball using pacote.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function packPackage(
  spec: string,
  options?: PacoteOptions,
): Promise<any> {
  const pack = getPack()
  return await pack(spec, {
    __proto__: null,
    signal: abortSignal,
    ...options,
    packumentCache,
    preferOffline: true,
  } as PacoteOptions)
}

/**
 * Read and parse a package.json file asynchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function readPackageJson(
  filepath: string,
  options?: ReadPackageJsonOptions,
): Promise<PackageJson | undefined> {
  const { editable, normalize, throws, ...normalizeOptions } = {
    __proto__: null,
    ...options,
  } as ReadPackageJsonOptions
  const pkgJson = (await readJson(resolvePackageJsonPath(filepath), {
    throws,
  })) as PackageJson | undefined
  if (pkgJson) {
    if (editable) {
      // Import toEditablePackageJson to avoid circular dependency.
      const { toEditablePackageJson } = require('./editable')
      return await toEditablePackageJson(pkgJson, {
        path: filepath,
        normalize,
        ...normalizeOptions,
      })
    }
    return normalize ? normalizePackageJson(pkgJson, normalizeOptions) : pkgJson
  }
  return undefined
}

/**
 * Read and parse package.json from a file path synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export function readPackageJsonSync(
  filepath: string,
  options?: NormalizeOptions & { editable?: boolean; throws?: boolean },
): PackageJson | undefined {
  const { editable, normalize, throws, ...normalizeOptions } = {
    __proto__: null,
    ...options,
  } as NormalizeOptions & {
    editable?: boolean
    throws?: boolean
    normalize?: boolean
  }
  const pkgJson = readJsonSync(resolvePackageJsonPath(filepath), { throws }) as
    | PackageJson
    | undefined
  if (pkgJson) {
    if (editable) {
      // Import toEditablePackageJsonSync to avoid circular dependency.
      const { toEditablePackageJsonSync } = require('./editable')
      return toEditablePackageJsonSync(pkgJson, {
        path: filepath,
        normalize,
        ...normalizeOptions,
      })
    }
    return normalize ? normalizePackageJson(pkgJson, normalizeOptions) : pkgJson
  }
  return undefined
}

/**
 * Resolve GitHub tarball URL for a package specifier.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function resolveGitHubTgzUrl(
  pkgNameOrId: string,
  where?: any,
): Promise<string> {
  const whereIsPkgJson = isObjectObject(where)
  const pkgJson = whereIsPkgJson
    ? where
    : await readPackageJson(where, { normalize: true })
  if (!pkgJson) {
    return ''
  }
  const { version } = pkgJson
  const npmPackageArg = getNpmPackageArg()
  const parsedSpec = npmPackageArg(
    pkgNameOrId,
    whereIsPkgJson ? undefined : where,
  )
  const isTarballUrl = isGitHubTgzSpec(parsedSpec)
  if (isTarballUrl) {
    return parsedSpec.saveSpec || ''
  }
  const isGitHubUrl = isGitHubUrlSpec(parsedSpec)
  const repository = pkgJson['repository'] as any
  const { project, user } = (isGitHubUrl
    ? parsedSpec.hosted
    : getRepoUrlDetails(repository?.url)) || { project: '', user: '' }

  if (user && project) {
    let apiUrl = ''
    if (isGitHubUrl) {
      apiUrl = gitHubTagRefUrl(user, project, parsedSpec.gitCommittish || '')
    } else {
      const fetcher = getFetcher()
      const versionStr = version as string
      // First try to resolve the sha for a tag starting with "v", e.g. v1.2.3.
      apiUrl = gitHubTagRefUrl(user, project, `v${versionStr}`)
      if (!(await fetcher(apiUrl, { method: 'head' })).ok) {
        // If a sha isn't found, try again with the "v" removed, e.g. 1.2.3.
        apiUrl = gitHubTagRefUrl(user, project, versionStr)
        if (!(await fetcher(apiUrl, { method: 'head' })).ok) {
          apiUrl = ''
        }
      }
    }
    if (apiUrl) {
      const fetcher = getFetcher()
      const resp = await fetcher(apiUrl)
      const json = (await resp.json()) as { object?: { sha?: string } }
      const sha = json?.object?.sha
      if (sha) {
        return gitHubTgzUrl(user, project, sha)
      }
    }
  }
  return ''
}

/**
 * Resolve full package name from a PURL object with custom delimiter.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolvePackageName(
  purlObj: any,
  delimiter: string = '/',
): string {
  const { name, namespace } = purlObj
  return `${namespace ? `${namespace}${delimiter}` : ''}${name}`
}

/**
 * Convert npm package name to Socket registry format with delimiter.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolveRegistryPackageName(pkgName: string): string {
  const purlObj = getPackageURL().fromString(`pkg:npm/${pkgName}`)
  return purlObj.namespace
    ? `${purlObj.namespace.slice(1)}${REGISTRY_SCOPE_DELIMITER}${purlObj.name}`
    : pkgName
}
