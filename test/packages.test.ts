import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, it } from 'node:test'

import fs from 'fs-extra'
import { glob as tinyGlob } from 'tinyglobby'
const { PackageURL } = require('packageurl-js')
import semver from 'semver'
// @ts-ignore
import { isObjectObject } from '../scripts/utils'

const extJs = '.js'
const extDts = '.d.ts'
const nodeVer = process.versions.node

const rootPath = path.resolve(__dirname, '..')
const relPackagesPath = 'packages'
const absPackagesPath = path.join(rootPath, relPackagesPath)
const overridesDir = 'overrides/'

const shimApiKeys = ['getPolyfill', 'implementation', 'shim']
const findLeakedApiKey = (keys: any[]) =>
  shimApiKeys.find(k => keys.includes(k))

const isDotFile = (filepath: string) => path.basename(filepath).startsWith('.')
const isDotPattern = (pattern: string) => pattern.startsWith('.')
const prepareReqId = (id: string) =>
  path.isAbsolute(id) || /^\.[/\\]/.test(id) ? id : `./${id}`

describe('Ecosystems', async () => {
  const ecosystems = await tinyGlob(['*/'], {
    cwd: absPackagesPath,
    onlyDirectories: true,
    expandDirectories: false
  })
  for (const eco_ of ecosystems) {
    const eco = eco_.replace(/[/\\]$/, '')
    describe(`${eco}:`, async () => {
      if (eco === 'npm') {
        const absEcoPath = path.join(absPackagesPath, eco)
        const pkgJsonGlob = await tinyGlob(['*/package.json'], {
          cwd: absEcoPath
        })
        for await (const relPkgJsonPath of pkgJsonGlob) {
          const pkgName = path.dirname(relPkgJsonPath)
          const pkgJson = await fs.readJSON(path.join(absEcoPath, relPkgJsonPath))
          const {
            browser: browserPath,
            main: mainPath,
            files: filesPatterns,
            overrides: pkgOverrides,
            resolutions: pkgResolutions,
            version
          } = pkgJson
          const purlObj = PackageURL.fromString(`pkg:${eco}/${pkgJson.name}@${version}`)
          const absPkgPath = `${absEcoPath}/${purlObj.name}`
          const indexPath = path.join(absPkgPath, 'index.js')
          const req_ = createRequire(indexPath)
          const req = (id: string) => req_(prepareReqId(id))
          req.resolve = (id: string) => req_.resolve(prepareReqId(id))
          const files = (
            await tinyGlob(['**/*'], {
              cwd: absPkgPath,
              dot: true,
              onlyFiles: true
            })
          ).sort()
          const filesPatternsAsArray = Array.isArray(filesPatterns)
            ? filesPatterns
            : []
          const filesFieldMatches = (
            await tinyGlob(
              [
                ...filesPatternsAsArray,
                'package.json',
                'LICEN[CS]E{.*,}',
                'README{.*,}'
              ],
              {
                cwd: absPkgPath,
                dot: true,
                onlyFiles: true
              }
            )
          ).sort()
          const dotFilePatterns = filesPatternsAsArray.filter(isDotPattern)
          const dotFileMatches = (
            await tinyGlob(dotFilePatterns, {
              cwd: absPkgPath,
              dot: true,
              onlyFiles: true
            })
          ).sort()
          const jsonFiles = files
            .filter(n => path.extname(n) === '.json')
            .sort()

          describe(`${pkgName}:`, async () => {
            it('package name should be "name" field of package.json', () => {
              assert.strictEqual(pkgJson.name, `@socketregistry/${pkgName}`)
            })

            it('package name should be included in "repository.directory" field of package.json', () => {
              assert.strictEqual(pkgJson.repository?.directory, `packages/npm/${pkgName}`)
            })

            it('file exists for "main" field of package.json', async () => {
              assert.doesNotThrow(() => req.resolve(mainPath))
            })

            if (browserPath) {
              it('file exists for "browser" field of package.json', async () => {
                assert.doesNotThrow(() => req.resolve(browserPath))
              })
            }

            if (jsonFiles.length) {
              it('should have valid .json files', async () => {
                for (const relJsonPath of jsonFiles) {
                  await assert.doesNotReject(
                    fs.readJson(req.resolve(relJsonPath))
                  )
                }
              })
            }

            it('should have a MIT LICENSE file', async () => {
              assert.ok(files.includes('LICENSE'))
              assert.ok(
                (
                  await fs.readFile(path.join(absPkgPath, 'LICENSE'), 'utf8')
                ).includes('MIT')
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
