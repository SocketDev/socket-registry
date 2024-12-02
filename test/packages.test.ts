import assertLoose from 'node:assert'
import assert from 'node:assert/strict'
import { existsSync, promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, it } from 'node:test'
import util from 'node:util'

import { fix } from '@npmcli/package-json'
import semver from 'semver'
import { glob as tinyGlob } from 'tinyglobby'

import constants from '@socketregistry/scripts/constants'
const {
  ENV,
  LICENSE,
  LICENSE_GLOB,
  NODE_VERSION,
  OVERRIDES,
  PACKAGE_JSON,
  README_GLOB,
  npmPackagesPath,
  parseArgsConfig
} = constants
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
import { localeCompare } from '@socketsecurity/registry/lib/sorts'
import { isNonEmptyString } from '@socketsecurity/registry/lib/strings'

// Pass args as tap --test-arg:
// npm run test:unit ./test/packages.test.ts -- --test-arg="--force"
const { values: cliArgs } = util.parseArgs(parseArgsConfig)

const overridesWithSlash = `${OVERRIDES}/`
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
  if (eco !== 'npm') {
    continue
  }
  const packageNames: readonly string[] =
    ENV.CI || cliArgs.force
      ? // Lazily access constants.npmPackageNames.
        constants.npmPackageNames
      : (() => {
          const testablePackages: Set<string> = ENV.PRE_COMMIT
            ? getStagedPackagesSync(eco, { asSet: true })
            : getModifiedPackagesSync(eco, { asSet: true })
          // Lazily access constants.npmPackageNames.
          return constants.npmPackageNames.filter((n: string) =>
            testablePackages.has(n)
          )
        })()

  describe(eco, { skip: !packageNames.length }, () => {
    for (const regPkgName of packageNames) {
      const pkgPath = path.join(npmPackagesPath, regPkgName)
      const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
      const pkgJsonExists = existsSync(pkgJsonPath)
      const pkgLicensePath = path.join(pkgPath, LICENSE)
      const origPkgName = resolveOriginalPackageName(regPkgName)

      describe(origPkgName, async () => {
        it('should have a package.json', () => {
          assert.ok(pkgJsonExists)
        })

        if (!pkgJsonExists) {
          return
        }
        const req_ = createRequire(`${pkgPath}/<dummy>`)
        const req = (id: string) => req_(prepareReqId(id))
        req.resolve = (id: string) => req_.resolve(prepareReqId(id))

        const pkgJson = await readPackageJson(pkgJsonPath)
        const {
          engines,
          files: filesPatterns,
          main: mainPath,
          overrides: pkgOverrides,
          resolutions: pkgResolutions
        } = pkgJson

        const entryExports = <
          | {
              [condition: string]: Exclude<
                typeof pkgJson.exports,
                string | null | undefined
              >
            }
          | undefined
        >pkgJson.exports

        const files = (
          await tinyGlob(['**/*'], {
            cwd: pkgPath,
            dot: true
          })
        ).sort(localeCompare)
        const filesPatternsAsArray = Array.isArray(filesPatterns)
          ? filesPatterns
          : []
        const filesFieldMatches = (
          await tinyGlob(
            [
              // Certain files are always included, regardless of settings:
              // https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files
              PACKAGE_JSON,
              LICENSE_GLOB,
              README_GLOB,
              ...filesPatternsAsArray
            ],
            {
              // Lazily access constants.ignoreGlobs.
              ignore: [...constants.ignoreGlobs],
              caseSensitiveMatch: false,
              cwd: pkgPath,
              dot: true
            }
          )
        ).sort(localeCompare)
        const dotFilePatterns = filesPatternsAsArray.filter(isDotPattern)
        const dotFileMatches = new Set(
          await tinyGlob(dotFilePatterns, {
            cwd: pkgPath,
            dot: true
          })
        )
        const jsonFiles = files
          .filter(p => path.extname(p) === '.json')
          .sort(localeCompare)
        const localOverridesFiles = filesFieldMatches.filter(p =>
          p.startsWith(overridesWithSlash)
        )
        const hasOverrides =
          !!pkgOverrides || !!pkgResolutions || localOverridesFiles.length > 0

        it('package name should be valid', () => {
          assert.ok(isValidPackageName(pkgJson.name))
        })

        it('package name should be "name" field of package.json', () => {
          assert.strictEqual(pkgJson.name, `@socketregistry/${regPkgName}`)
        })

        it('package name should be included in "repository.directory" field of package.json', () => {
          assert.strictEqual(
            (pkgJson.repository as { directory?: string })?.directory,
            `packages/npm/${regPkgName}`
          )
        })

        it('should not have "main" field in package.json', () => {
          assert.ok(!Object.hasOwn(pkgJson, 'main'))
        })

        if (entryExports) {
          it('file exists for every "export" entry of package.json', () => {
            assert.ok(isObjectObject(entryExports))
            for (const subpath of getSubpaths(entryExports)) {
              assert.ok(existsSync(path.join(pkgPath, subpath)))
            }
          })

          it('should have a .d.ts file for every .js file', () => {
            const jsSubpaths = (<string[]>getSubpaths(entryExports)).filter(s =>
              /\.[cm]?js$/.test(s)
            )
            for (const subpath of jsSubpaths) {
              const types = trimLeadingDotSlash(
                findTypesForSubpath(entryExports, subpath) ?? ''
              )
              assert.ok(files.includes(types))
            }
          })
        }

        if (mainPath) {
          it('should not have "exports" field in package.json', () => {
            assert.ok(!Object.hasOwn(pkgJson, 'exports'))
          })

          it('file exists for "main" field of package.json', () => {
            assert.doesNotThrow(() => req.resolve(mainPath))
          })
        }

        if (engines) {
          it('should have valid "engine" entry version ranges', () => {
            for (const { 0: key, 1: value } of objectEntries(engines)) {
              assert.ok(
                typeof value === 'string' && semver.validRange(value),
                String(key)
              )
            }
          })
        }

        if (jsonFiles.length) {
          it('should have valid .json files', async () => {
            await Promise.all(
              jsonFiles.map(jsonPath =>
                assert.doesNotReject(readJson(req.resolve(jsonPath)))
              )
            )
          })
        }

        it('should have a "sideEffects" field of `false` in package.json', () => {
          assert.strictEqual(pkgJson.sideEffects, false)
        })

        it('should not need package.json fixing', () => {
          const changes: string[] = []
          fix(pkgPath, { changes })
          assert.strictEqual(changes.length, 0)
        })

        it(`should have a MIT ${LICENSE} file`, async () => {
          assert.ok(files.includes(LICENSE))
          assert.ok((await fs.readFile(pkgLicensePath, 'utf8')).includes('MIT'))
        })

        const manifestData = getManifestData(eco, regPkgName)
        if (manifestData?.license !== 'Public Domain') {
          it(`should have an original license file`, () => {
            assert.ok(files.some(p => p.includes('.original')))
          })
        }

        it('should have a "files" field in package.json', () => {
          assert.ok(
            Array.isArray(filesPatterns) &&
              filesPatterns.length > 0 &&
              filesPatterns.every(p => typeof p === 'string')
          )
        })

        if (
          files.includes('implementation.js') &&
          files.includes('polyfill.js')
        ) {
          describe('es-shim', () => {
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
                assert.doesNotThrow(() => req.resolve(defaultMainEntry))
              })
            }

            it('should not leak api', async t => {
              if (skipping) return t.skip(skipMessage)
              const getPolyfill = req('./polyfill.js')
              const beforeKeys = Reflect.ownKeys(getPolyfill())
              const maybeLeakBefore = findLeakedApiKey(beforeKeys)
              assert.ok(
                !maybeLeakBefore,
                `leaking BEFORE index.js required ('${maybeLeakBefore}')`
              )
              req('./index.js')
              const afterKeys = Reflect.ownKeys(getPolyfill())
              assert.deepEqual(
                afterKeys,
                beforeKeys,
                'leaking AFTER index.js required'
              )
            })

            it('index.js exports es-shim api', async t => {
              if (skipping) return t.skip(skipMessage)
              const keys = Reflect.ownKeys(req('./index.js'))
              assert.ok(shimApiKeys.every(k => keys.includes(k)))
            })

            it('getPolyfill() is like implementation', async t => {
              if (skipping) return t.skip(skipMessage)
              const impl = req('./implementation.js')
              const polyfill = req('./polyfill.js')()
              assert.strictEqual(typeof impl, typeof polyfill)
              if (typeof impl === 'function') {
                assert.strictEqual(impl.name, polyfill.name)
                assert.strictEqual(impl.length, polyfill.length)
              } else {
                assertLoose.equal(impl, polyfill)
              }
            })
          })
        }

        if (hasOverrides) {
          it('should have overrides and resolutions fields in package.json', () => {
            assert.ok(isObjectObject(pkgOverrides))
            assert.ok(isObjectObject(pkgResolutions))
          })

          it('should not have overrides directory', () => {
            assert.strictEqual(localOverridesFiles.length, 0)
          })
        } else {
          it('package files should match "files" field', () => {
            const filesToCompare = files.filter(p =>
              isDotFile(p) ? dotFileMatches.has(p) : !isSrcFile(p)
            )
            assert.deepEqual(filesFieldMatches, filesToCompare)
          })
        }
      })
    }
  })
}
