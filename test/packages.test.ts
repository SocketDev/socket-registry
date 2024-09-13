import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, it } from 'node:test'

import fs from 'fs-extra'
import { glob as tinyGlob } from 'tinyglobby'
import semver from 'semver'
import validateNpmPackageName from 'validate-npm-package-name'

import {
  LICENSE,
  PACKAGE_JSON,
  ignores
  // @ts-ignore
} from '@socketregistry/scripts/constants'
// @ts-ignore
import { readPackageJson } from '@socketregistry/scripts/utils/fs'
// @ts-ignore
import { isObjectObject } from '@socketregistry/scripts/utils/objects'
import {
  trimLeadingDotSlash,
  trimTrailingSlash
  // @ts-ignore
} from '@socketregistry/scripts/utils/path'
// @ts-ignore
import { localCompare } from '@socketregistry/scripts/utils/strings'

const extJs = '.js'
const extDts = '.d.ts'
const nodeVer = process.versions.node

const rootPath = path.resolve(__dirname, '..')
const rootPackagesPath = path.join(rootPath, 'packages')
const overridesDir = 'overrides/'

const shimApiKeys = ['getPolyfill', 'implementation', 'shim']
const findLeakedApiKey = (keys: any[]) =>
  shimApiKeys.find(k => keys.includes(k))

const isDotFile = (filepath: string) => path.basename(filepath).startsWith('.')
const isDotPattern = (pattern: string) => pattern.startsWith('.')
const prepareReqId = (id: string) =>
  path.isAbsolute(id) ? id : `./${trimLeadingDotSlash(id)}`

describe('Ecosystems', async () => {
  const ecosystems = (
    await tinyGlob(['*/'], {
      cwd: rootPackagesPath,
      onlyDirectories: true,
      expandDirectories: false
    })
  )
    .map(trimTrailingSlash)
    .sort(localCompare)
  for (const eco of ecosystems) {
    describe(`${eco}:`, async () => {
      if (eco === 'npm') {
        const packagesPath = path.join(rootPackagesPath, eco)
        const packageNames = <string[]>(
          await tinyGlob(['*/'], {
            cwd: packagesPath,
            onlyDirectories: true,
            expandDirectories: false
          })
        )
          .map(trimTrailingSlash)
          .sort(localCompare)
        for await (const pkgName of packageNames) {
          const pkgPath = path.join(packagesPath, pkgName)
          const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
          const pkgJsonExists = fs.existsSync(pkgJsonPath)
          const pkgLicensePath = path.join(pkgPath, LICENSE)

          describe(`${pkgName}:`, async () => {
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
              browser: browserPath,
              engines,
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
                  'LICEN[CS]E{.*,}',
                  'README{.*,}',
                  ...filesPatternsAsArray
                ],
                {
                  ignore: ignores,
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
              .filter(n => path.extname(n) === '.json')
              .sort(localCompare)

            it('package name should be valid', () => {
              assert.ok(
                validateNpmPackageName(pkgJson.name).validForNewPackages
              )
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

            it('file exists for "main" field of package.json', async () => {
              assert.doesNotThrow(() => req.resolve(mainPath))
            })

            if (browserPath) {
              it('file exists for "browser" field of package.json', async () => {
                assert.doesNotThrow(() => req.resolve(browserPath))
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

            it('should have a MIT LICENSE file', async () => {
              assert.ok(files.includes('LICENSE'))
              assert.ok(
                (await fs.readFile(pkgLicensePath, 'utf8')).includes('MIT')
              )
            })

            it('should have a .d.ts file for every .js file', async () => {
              const jsFiles = files
                .filter(n => n.endsWith(extJs) && !n.startsWith(overridesDir))
                .map(n => n.slice(0, -extJs.length))
                .sort()
              const dtsFiles = files
                .filter(n => n.endsWith(extDts))
                .map(n => n.slice(0, -extDts.length))
                .sort()
              assert.deepEqual(jsFiles, dtsFiles)
            })

            it('should have a "files" field in package.json', async () => {
              assert.ok(
                Array.isArray(filesPatterns) &&
                  filesPatterns.length > 0 &&
                  filesPatterns.every(n => typeof n === 'string')
              )
            })

            it('package files should match "files" field', async () => {
              const filesToCompare = files.filter(
                n => !isDotFile(n) || dotFileMatches.includes(n)
              )
              assert.deepEqual(filesFieldMatches, filesToCompare)
            })

            if (
              files.includes('implementation.js') &&
              files.includes('polyfill.js')
            ) {
              describe('es-shim', async () => {
                const nodeRange = pkgJson?.engines?.node
                const skipping = nodeRange
                  ? !semver.satisfies(nodeVer, nodeRange)
                  : false
                const skipMessage = skipping
                  ? `supported in ${nodeRange}, running ${nodeVer}`
                  : ''

                it('index.js exists for "main" field of package.json', async () => {
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

            const localOverridesFiles = filesFieldMatches.filter(n =>
              n.startsWith(overridesDir)
            )
            const hasOverrides =
              !!pkgOverrides ||
              !!pkgResolutions ||
              localOverridesFiles.length > 0

            if (hasOverrides) {
              const localOverridesPackages = localOverridesFiles.map(n =>
                n.slice(
                  overridesDir.length,
                  n.indexOf('/', overridesDir.length)
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
})
