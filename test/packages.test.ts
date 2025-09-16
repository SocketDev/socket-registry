import { existsSync, promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import util from 'node:util'

import { fix } from '@npmcli/package-json'
import { glob } from 'fast-glob'
import semver from 'semver'
import { describe, expect, it } from 'vitest'

import constants, { EXT_JSON } from '@socketregistry/scripts/constants'
import {
  getModifiedPackagesSync,
  getStagedPackagesSync
} from '@socketregistry/scripts/lib/git'
import { getManifestData } from '@socketsecurity/registry'
import { readJson } from '@socketsecurity/registry/lib/fs'
import {
  isObjectObject,
  objectEntries
} from '@socketsecurity/registry/lib/objects'
import {
  findTypesForSubpath,
  getSubpaths,
  isValidPackageName,
  readPackageJson,
  resolveOriginalPackageName
} from '@socketsecurity/registry/lib/packages'
import { trimLeadingDotSlash } from '@socketsecurity/registry/lib/path'
import { naturalCompare } from '@socketsecurity/registry/lib/sorts'
import { isNonEmptyString } from '@socketsecurity/registry/lib/strings'

const {
  LICENSE,
  LICENSE_GLOB,
  NPM,
  PACKAGE_JSON,
  README_GLOB,
  SOCKET_REGISTRY_SCOPE,
  UTF8,
  ignoreGlobs
} = constants

// Pass args:
// npm run test:unit ./test/packages.test.ts -- --force
const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

const shimApiKeys = ['getPolyfill', 'implementation', 'shim']

function findLeakedApiKey(keys: any[]): string | undefined {
  return shimApiKeys.find(k => keys.includes(k))
}

function isDotFile(filepath: string) {
  const basename = path.basename(filepath)
  return basename.length > 0 && basename.charCodeAt(0) === 46 /*'.'*/
}

function isSrcFile(filepath: string) {
  return filepath.startsWith('src/')
}

function isDotPattern(pattern: string) {
  return (
    pattern.length > 2 &&
    pattern.charCodeAt(0) === 46 /*'.'*/ &&
    pattern.charCodeAt(1) !== 46 /*'.'*/
  )
}

function prepareReqId(id: string) {
  return path.isAbsolute(id) ? id : `./${trimLeadingDotSlash(id)}`
}

for (const eco of constants.ecosystems) {
  if (eco !== NPM) {
    continue
  }
  const { ENV } = constants
  const packageNames: readonly string[] =
    cliArgs.force || ENV.CI
      ? constants.npmPackageNames
      : (() => {
          const testablePackages: Set<string> = ENV.PRE_COMMIT
            ? getStagedPackagesSync(eco, { asSet: true })
            : getModifiedPackagesSync(eco, { asSet: true })
          return constants.npmPackageNames.filter((n: string) =>
            testablePackages.has(n)
          )
        })()

  describe(eco, { skip: !packageNames.length }, () => {
    for (const sockRegPkgName of packageNames) {
      const pkgPath = path.join(constants.npmPackagesPath, sockRegPkgName)
      const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
      const pkgJsonExists = existsSync(pkgJsonPath)
      const pkgLicensePath = path.join(pkgPath, LICENSE)
      const origPkgName = resolveOriginalPackageName(sockRegPkgName)

      describe(origPkgName, async () => {
        it('should have a package.json', () => {
          expect(pkgJsonExists).toBe(true)
        })

        if (!pkgJsonExists) {
          return
        }
        const req_ = createRequire(`${pkgPath}/<dummy>`)
        const req = (id: string) => req_(prepareReqId(id))
        req.resolve = (id: string) => req_.resolve(prepareReqId(id))

        const pkgJson = await readPackageJson(pkgJsonPath, { normalize: true })
        const {
          dependencies,
          engines,
          files: filesPatterns,
          main: mainPath,
          overrides: pkgOverrides,
          resolutions: pkgResolutions
        } = pkgJson

        const entryExports = pkgJson.exports as
          | {
              [condition: string]: Exclude<
                typeof pkgJson.exports,
                string | null | undefined
              >
            }
          | undefined

        const files = (
          await glob(['**/*'], {
            cwd: pkgPath,
            dot: true
          })
        ).sort(naturalCompare)

        it('package name should be valid', () => {
          expect(isValidPackageName(pkgJson.name)).toBe(true)
        })

        it('package name should be "name" field of package.json', () => {
          expect(pkgJson.name).toBe(`@socketregistry/${sockRegPkgName}`)
        })

        it('package name should be included in "repository.directory" field of package.json', () => {
          expect(
            (pkgJson.repository as { directory?: string })?.directory
          ).toBe(`packages/npm/${sockRegPkgName}`)
        })

        it('should not have "main" field in package.json', () => {
          expect(Object.hasOwn(pkgJson, 'main')).toBe(false)
        })

        if (entryExports) {
          it('file exists for every "export" entry of package.json', () => {
            expect(isObjectObject(entryExports)).toBe(true)
            for (const subpath of getSubpaths(entryExports)) {
              expect(existsSync(path.join(pkgPath, subpath))).toBe(true)
            }
          })

          it('should have a .d.ts file for every .js file', () => {
            const jsSubpaths = (getSubpaths(entryExports) as string[]).filter(
              s => /\.[cm]?js$/.test(s)
            )
            for (const subpath of jsSubpaths) {
              const types = trimLeadingDotSlash(
                findTypesForSubpath(entryExports, subpath) ?? ''
              )
              expect(files.includes(types)).toBe(true)
            }
          })
        }

        if (mainPath) {
          it('should not have "exports" field in package.json', () => {
            expect(Object.hasOwn(pkgJson, 'exports')).toBe(false)
          })

          it('file exists for "main" field of package.json', () => {
            expect(() => req.resolve(mainPath)).not.toThrow()
          })
        }

        if (engines) {
          it('should have valid "engine" entry version ranges', () => {
            for (const { 1: value } of objectEntries(engines)) {
              expect(
                typeof value === 'string' && semver.validRange(value)
              ).toBe(true)
            }
          })
        }

        const jsonFiles = files
          .filter(p => path.extname(p) === EXT_JSON)
          .sort(naturalCompare)

        if (jsonFiles.length) {
          it('should have valid .json files', async () => {
            await Promise.all(
              jsonFiles.map(async jsonPath => {
                await expect(
                  readJson(req.resolve(jsonPath))
                ).resolves.toBeDefined()
              })
            )
          })
        }

        it('should have a "sideEffects" field of `false` in package.json', () => {
          expect(pkgJson.sideEffects).toBe(false)
        })

        it('should not need package.json fixing', () => {
          const changes: string[] = []
          fix(pkgPath, { changes })
          expect(changes.length).toBe(0)
        })

        it(`should have a MIT ${LICENSE} file`, async () => {
          expect(files.includes(LICENSE)).toBe(true)
          expect(
            (await fs.readFile(pkgLicensePath, UTF8)).includes('MIT')
          ).toBe(true)
        })

        const manifestData = getManifestData(eco, sockRegPkgName)
        if (manifestData?.license !== 'Public Domain') {
          it(`should have an original license file`, () => {
            expect(files.some(p => p.includes('.original'))).toBe(true)
          })
        }

        it('should have a "files" field in package.json', () => {
          expect(
            Array.isArray(filesPatterns) &&
              filesPatterns.length > 0 &&
              filesPatterns.every(p => typeof p === 'string')
          ).toBe(true)
        })

        if (
          files.includes('implementation.js') &&
          files.includes('polyfill.js')
        ) {
          describe('es-shim', () => {
            const { NODE_VERSION } = constants
            const nodeRange = pkgJson?.engines?.['node']
            const skipping =
              isNonEmptyString(nodeRange) &&
              !semver.satisfies(NODE_VERSION, nodeRange)
            const skipMessage = skipping
              ? `supported in ${nodeRange}, running ${NODE_VERSION}`
              : ''

            if (entryExports) {
              it('index.js exists for exports["."].default field of package.json', () => {
                const mainEntry = entryExports['.']
                const defaultMainEntry = Array.isArray(mainEntry)
                  ? (mainEntry.at(-1) as { default: string })?.default
                  : (mainEntry as { default: string })?.default
                expect(() => req.resolve(defaultMainEntry)).not.toThrow()
              })
            }

            it('should not leak api', async t => {
              if (skipping) {
                return t.skip(skipMessage)
              }
              const getPolyfill = req('./polyfill.js')
              const beforeKeys = Reflect.ownKeys(getPolyfill())
              const maybeLeakBefore = findLeakedApiKey(beforeKeys)
              expect(maybeLeakBefore).toBeFalsy()
              req('./index.js')
              const afterKeys = Reflect.ownKeys(getPolyfill())
              expect(afterKeys).toEqual(beforeKeys)
            })

            it('index.js exports es-shim api', async t => {
              if (skipping) {
                return t.skip(skipMessage)
              }
              const keys = Reflect.ownKeys(req('./index.js'))
              expect(shimApiKeys.every(k => keys.includes(k))).toBe(true)
            })

            it('getPolyfill() is like implementation', async t => {
              if (skipping) {
                return t.skip(skipMessage)
              }
              const impl = req('./implementation.js')
              const polyfill = req('./polyfill.js')()
              expect(typeof impl).toBe(typeof polyfill)
              if (typeof impl === 'function') {
                expect(impl.name).toBe(polyfill.name)
                expect(impl.length).toBe(polyfill.length)
              } else {
                expect(impl).toEqual(polyfill)
              }
            })
          })
        }

        const filesPatternsAsArray = Array.isArray(filesPatterns)
          ? filesPatterns
          : []
        const filesFieldMatches = (
          await glob(
            [
              // Certain files are always included, regardless of settings:
              // https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files
              PACKAGE_JSON,
              LICENSE_GLOB,
              README_GLOB,
              ...filesPatternsAsArray
            ],
            {
              ignore: Array.from(ignoreGlobs),
              caseSensitiveMatch: false,
              cwd: pkgPath,
              dot: true
            }
          )
        ).sort(naturalCompare)

        const dotFilePatterns = filesPatternsAsArray.filter(isDotPattern)
        const dotFileMatches = new Set(
          await glob(dotFilePatterns, {
            cwd: pkgPath,
            dot: true
          })
        )

        const hasOverridesAsDeps = Object.keys(dependencies ?? {}).some(k =>
          k.startsWith(SOCKET_REGISTRY_SCOPE)
        )

        const hasOverrides =
          hasOverridesAsDeps || !!pkgOverrides || !!pkgResolutions

        if (hasOverrides) {
          if (!hasOverridesAsDeps) {
            it('should have overrides and resolutions fields in package.json', () => {
              expect(isObjectObject(pkgOverrides)).toBe(true)
              expect(isObjectObject(pkgResolutions)).toBe(true)
            })
          }
        } else {
          it('package files should match "files" field', () => {
            const filesToCompare = files.filter(p =>
              isDotFile(p) ? dotFileMatches.has(p) : !isSrcFile(p)
            )
            expect(filesFieldMatches).toEqual(filesToCompare)
          })
        }
      })
    }
  })
}
