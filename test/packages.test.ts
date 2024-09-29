import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, it } from 'node:test'
import util from 'node:util'

import fs from 'fs-extra'
import semver from 'semver'
import { glob as tinyGlob } from 'tinyglobby'

// @ts-ignore
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
  // @ts-ignore
} from '@socketregistry/scripts/utils/git'
// @ts-ignore
import { isObjectObject } from '@socketregistry/scripts/utils/objects'
import {
  isValidPackageName,
  readPackageJson
  // @ts-ignore
} from '@socketregistry/scripts/utils/packages'
// @ts-ignore
import { localCompare } from '@socketregistry/scripts/utils/sorts'
// @ts-ignore
import { isNonEmptyString } from '@socketregistry/scripts/utils/strings'
// @ts-ignore
import { getManifestData } from '@socketregistry/scripts/utils/templates'

// Use by passing as a tap --test-arg:
// npm run test:unit ./test/packages.test.ts -- --test-arg="--force"
const { values: cliArgs } = util.parseArgs(parseArgsConfig)

const extJs = '.js'
const extDts = '.d.ts'
const leadingDotSlashRegExp = /^\.\.?[/\\]/
const overridesWithSlash = `${OVERRIDES}/`
const shimApiKeys = ['getPolyfill', 'implementation', 'shim']

function findLeakedApiKey(keys: any[]): string | undefined {
  return shimApiKeys.find(k => keys.includes(k))
}

function isDotFile(filepath: string) {
  const basename = path.basename(filepath)
  return basename.length > 0 && basename.charCodeAt(0) === 46 /*'.'*/
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

function trimLeadingDotSlash(filepath: string): string {
  return filepath.replace(leadingDotSlashRegExp, '')
}

for (const eco of constants.ecosystems) {
  describe(eco, () => {
    if (eco === 'npm') {
      // Lazily access constants.npmPackageNames.
      const { npmPackageNames } = constants
      const packageNames: string[] =
        ENV.CI || cliArgs.force
          ? npmPackageNames
          : (() => {
              const testablePackages: Set<string> = ENV.PRE_COMMIT
                ? getStagedPackagesSync(eco, { asSet: true })
                : getModifiedPackagesSync(eco, { asSet: true })
              return npmPackageNames.filter((n: string) =>
                testablePackages.has(n)
              )
            })()
      for (const pkgName of packageNames) {
        const pkgPath = path.join(npmPackagesPath, pkgName)
        const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
        const pkgJsonExists = fs.existsSync(pkgJsonPath)
        const pkgLicensePath = path.join(pkgPath, LICENSE)

        describe(pkgName, async () => {
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
            exports: entryExports,
            files: filesPatterns,
            main: mainPath,
            overrides: pkgOverrides,
            resolutions: pkgResolutions
          } = pkgJson

          const files = (
            await tinyGlob(['**/*'], {
              cwd: pkgPath,
              dot: true
            })
          ).sort(localCompare)
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
                ignore: constants.ignoreGlobs,
                caseSensitiveMatch: false,
                cwd: pkgPath,
                dot: true
              }
            )
          ).sort(localCompare)
          const dotFilePatterns = filesPatternsAsArray.filter(isDotPattern)
          const dotFileMatches = (
            await tinyGlob(dotFilePatterns, {
              cwd: pkgPath,
              dot: true
            })
          ).sort(localCompare)
          const jsonFiles = files
            .filter(p => path.extname(p) === '.json')
            .sort(localCompare)

          it('package name should be valid', () => {
            assert.ok(isValidPackageName(pkgJson.name))
          })

          it('package name should be "name" field of package.json', () => {
            assert.strictEqual(pkgJson.name, `@socketregistry/${pkgName}`)
          })

          it('package name should be included in "repository.directory" field of package.json', () => {
            assert.strictEqual(
              pkgJson.repository?.directory,
              `packages/npm/${pkgName}`
            )
          })

          if (entryExports) {
            it('file exists for every "export" entry of package.json', () => {
              for (const entry of [
                entryExports.default,
                ...Object.values(entryExports.node)
              ]) {
                assert.doesNotThrow(() => req.resolve(entry as string))
              }
            })

            it('should not have "main" field in package.json', () => {
              assert.ok(!Object.hasOwn(pkgJson, 'main'))
            })
          }

          if (mainPath) {
            it('file exists for "main" field of package.json', () => {
              assert.doesNotThrow(() => req.resolve(mainPath))
            })

            it('should not have "exports" field in package.json', () => {
              assert.ok(!Object.hasOwn(pkgJson, 'exports'))
            })
          }

          if (engines) {
            it('should have valid "engine" entry version ranges', () => {
              for (const { 0: key, 1: value } of Object.entries(engines)) {
                assert.ok(
                  typeof value === 'string' && semver.validRange(value),
                  key
                )
              }
            })
          }

          if (jsonFiles.length) {
            it('should have valid .json files', async () => {
              for (const jsonPath of jsonFiles) {
                await assert.doesNotReject(fs.readJson(req.resolve(jsonPath)))
              }
            })
          }

          it('should have a "sideEffects" field of `false` in package.json', () => {
            assert.strictEqual(pkgJson.sideEffects, false)
          })

          it(`should have a MIT ${LICENSE} file`, async () => {
            assert.ok(files.includes(LICENSE))
            assert.ok(
              (await fs.readFile(pkgLicensePath, 'utf8')).includes('MIT')
            )
          })

          const manifestData = getManifestData(pkgName)
          if (manifestData?.license !== 'Public Domain') {
            it(`should have an original license file`, () => {
              assert.ok(files.some(p => p.includes('.original')))
            })
          }

          it('should have a .d.ts file for every .js file', () => {
            const jsFiles = files
              .filter(
                p => p.endsWith(extJs) && !p.startsWith(overridesWithSlash)
              )
              .map(p => p.slice(0, -extJs.length))
              .sort()
            const dtsFiles = files
              .filter(p => p.endsWith(extDts))
              .map(p => p.slice(0, -extDts.length))
              .sort()
            assert.deepEqual(jsFiles, dtsFiles)
          })

          it('should have a "files" field in package.json', () => {
            assert.ok(
              Array.isArray(filesPatterns) &&
                filesPatterns.length > 0 &&
                filesPatterns.every(p => typeof p === 'string')
            )
          })

          it('package files should match "files" field', () => {
            const filesToCompare = files.filter(
              p => !isDotFile(p) || dotFileMatches.includes(p)
            )
            assert.deepEqual(filesFieldMatches, filesToCompare)
          })

          if (
            files.includes('implementation.js') &&
            files.includes('polyfill.js')
          ) {
            describe('es-shim', () => {
              const nodeRange = pkgJson?.engines?.node
              const skipping =
                isNonEmptyString(nodeRange) &&
                !semver.satisfies(NODE_VERSION, nodeRange)
              const skipMessage = skipping
                ? `supported in ${nodeRange}, running ${NODE_VERSION}`
                : ''

              it('index.js exists for "main" field of package.json', () => {
                assert.doesNotThrow(() => req.resolve(mainPath))
              })

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

              it('implementation.js exports es-shim api', async t => {
                if (skipping) return t.skip(skipMessage)
                const main = req(mainPath)
                const mainKeys = Reflect.ownKeys(main)
                assert.ok(shimApiKeys.every(k => mainKeys.includes(k)))
              })

              it('getPolyfill() === implementation', async t => {
                if (skipping) return t.skip(skipMessage)
                assert.strictEqual(
                  req('./polyfill.js')(),
                  req('./implementation.js')
                )
              })
            })
          }

          const localOverridesFiles = filesFieldMatches.filter(p =>
            p.startsWith(overridesWithSlash)
          )
          const hasOverrides =
            !!pkgOverrides || !!pkgResolutions || localOverridesFiles.length > 0

          if (hasOverrides) {
            const localOverridesPackages = localOverridesFiles.map(p =>
              p.slice(
                overridesWithSlash.length,
                p.indexOf('/', overridesWithSlash.length)
              )
            )

            it('should have overrides and resolutions fields in package.json', () => {
              assert.ok(isObjectObject(pkgOverrides))
              assert.deepEqual(pkgOverrides, pkgResolutions)
            })

            it('should have overrides directory', () => {
              assert.ok(localOverridesFiles.length > 0)
            })

            it('overrides files should match corresponding package.json field values', () => {
              for (const name of localOverridesPackages) {
                assert.strictEqual(
                  pkgOverrides[name],
                  `file:./overrides/${name}`
                )
              }
            })
          }
        })
      }
    }
  })
}
