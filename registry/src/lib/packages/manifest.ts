/**
 * @fileoverview Package manifest and packument fetching utilities.
 */

import { resolvePackageJsonEntryExports } from './exports'
import { isRegistryFetcherType } from './validation'
import SOCKET_GITHUB_ORG from '../constants/SOCKET_GITHUB_ORG'
import SOCKET_REGISTRY_REPO_NAME from '../constants/SOCKET_REGISTRY_REPO_NAME'
import abortSignal from '../constants/abort-signal'
import packageDefaultNodeRange from '../constants/package-default-node-range'
import PACKAGE_DEFAULT_SOCKET_CATEGORIES from '../constants/package-default-socket-categories'
import packumentCache from '../constants/packument-cache'
import { isObjectObject, objectEntries } from '../objects'

import type { PackageJson, PacoteOptions } from '../packages'

// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ArrayIsArray = Array.isArray

const pkgScopePrefixRegExp = /^@socketregistry\//

let _npmPackageArg: typeof import('npm-package-arg') | undefined
/*@__NO_SIDE_EFFECTS__*/
function getNpmPackageArg() {
  if (_npmPackageArg === undefined) {
    _npmPackageArg = /*@__PURE__*/ require('../../external/npm-package-arg')
  }
  return _npmPackageArg!
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
 * Create a package.json object for a Socket registry package.
 */
/*@__NO_SIDE_EFFECTS__*/
export function createPackageJson(
  sockRegPkgName: string,
  directory: string,
  options?: PackageJson | undefined,
): PackageJson {
  const {
    dependencies,
    description,
    engines,
    exports: entryExportsRaw,
    files,
    keywords,
    main,
    overrides,
    resolutions,
    sideEffects,
    socket,
    type,
    version,
  } = { __proto__: null, ...options } as PackageJson
  const name = `@socketregistry/${sockRegPkgName.replace(pkgScopePrefixRegExp, '')}`
  const entryExports = resolvePackageJsonEntryExports(entryExportsRaw)
  const githubUrl = `https://github.com/${SOCKET_GITHUB_ORG}/${SOCKET_REGISTRY_REPO_NAME}`
  return {
    __proto__: null,
    name,
    version,
    license: 'MIT',
    description,
    keywords,
    homepage: `${githubUrl}/tree/main/${directory}`,
    repository: {
      type: 'git',
      url: `git+${githubUrl}.git`,
      directory,
    },
    ...(type ? { type } : {}),
    ...(entryExports ? { exports: { ...entryExports } } : {}),
    ...(entryExports ? {} : { main: `${main ?? './index.js'}` }),
    sideEffects: sideEffects !== undefined && !!sideEffects,
    ...(isObjectObject(dependencies)
      ? { dependencies: { ...dependencies } }
      : {}),
    ...(isObjectObject(overrides) ? { overrides: { ...overrides } } : {}),
    ...(isObjectObject(resolutions) ? { resolutions: { ...resolutions } } : {}),
    ...(isObjectObject(engines)
      ? {
          engines: Object.fromEntries(
            objectEntries(engines).map((pair: [PropertyKey, any]) => {
              const strKey = String(pair[0])
              const result: [string, any] = [strKey, pair[1]]
              if (strKey === 'node') {
                const semver = getSemver()
                const { 1: range } = result
                if (
                  !semver.satisfies(
                    // Roughly check Node range as semver.coerce will strip leading
                    // v's, carets (^), comparators (<,<=,>,>=,=), and tildes (~).
                    semver.coerce(range) || '0.0.0',
                    packageDefaultNodeRange,
                  )
                ) {
                  result[1] = packageDefaultNodeRange
                }
              }
              return result
            }),
          ),
        }
      : { engines: { node: packageDefaultNodeRange } }),
    files: ArrayIsArray(files) ? files.slice() : ['*.d.ts', '*.js'],
    ...(isObjectObject(socket)
      ? { socket: { ...socket } }
      : {
          socket: {
            // Valid categories are: cleanup, levelup, speedup, tuneup
            categories: PACKAGE_DEFAULT_SOCKET_CATEGORIES,
          },
        }),
  } as PackageJson
}

/**
 * Fetch the manifest for a package.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function fetchPackageManifest(
  pkgNameOrId: string,
  options?: PacoteOptions,
): Promise<any> {
  const pacoteOptions = {
    __proto__: null,
    signal: abortSignal,
    ...options,
    packumentCache,
    preferOffline: true,
  } as PacoteOptions & { where?: string }
  const { signal } = pacoteOptions
  if (signal?.aborted) {
    return undefined
  }
  const pacote = getPacote()
  let result
  try {
    result = await pacote.manifest(pkgNameOrId, pacoteOptions)
  } catch {}
  if (signal?.aborted) {
    return undefined
  }
  if (result) {
    const npmPackageArg = getNpmPackageArg()
    const spec = npmPackageArg(pkgNameOrId, pacoteOptions.where)
    if (isRegistryFetcherType(spec.type)) {
      return result
    }
  }
  // Convert a manifest not fetched by RegistryFetcher to one that is.
  return result
    ? await fetchPackageManifest(
        `${result.name}@${result.version}`,
        pacoteOptions,
      )
    : null
}

/**
 * Fetch the packument (package document) for a package.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function fetchPackagePackument(
  pkgNameOrId: string,
  options?: PacoteOptions,
): Promise<any> {
  const pacote = getPacote()
  try {
    return await pacote.packument(pkgNameOrId, {
      __proto__: null,
      signal: abortSignal,
      ...options,
      packumentCache,
      preferOffline: true,
    })
  } catch {}
  return undefined
}
