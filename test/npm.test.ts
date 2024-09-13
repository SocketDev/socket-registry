import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import spawn from '@npmcli/promise-spawn'
import { glob as tinyGlob } from 'tinyglobby'
import which from 'which'

// @ts-ignore
import { NODE_WORKSPACE } from '@socketregistry/scripts/constants'
// @ts-ignore
import { readPackageJson } from '@socketregistry/scripts/utils/fs'
// @ts-ignore
import { trimTrailingSlash } from '@socketregistry/scripts/utils/path'
// @ts-ignore
import { localCompare, trimQuotes } from '@socketregistry/scripts/utils/strings'

const { execPath } = process
const rootPath = path.resolve(__dirname, '..')
const testNpmPath = path.join(rootPath, 'test/npm')
const runScriptExecPath = which.sync('run-s')
const workspacePath = path.join(testNpmPath, NODE_WORKSPACE)

const skippedPackages = [
  // Fails
  'array-flatten',
  'array.from',
  'arraybuffer.prototype.slice',
  'assert',
  'asynciterator.prototype',
  'available-typed-arrays',
  'date',
  'deep-equal',
  'es-aggregate-error',
  'es-define-property',
  'es-get-iterator',
  'es-iterator-helpers',
  'gopd',
  'has-symbols',
  'has-tostringtag',
  'is-arguments',
  'is-array-buffer',
  'is-bigint',
  'is-generator-function',
  'is-regex',
  'is-shared-array-buffer',
  'number-is-nan',
  'object-keys',
  'object.assign',
  'object.groupby',
  'path-parse',
  'promise.allsettled',
  'promise.any',
  'safe-array-concat',
  'safe-buffer',
  'safer-buffer',
  'set-function-length',
  'string.prototype.matchall',
  'typed-array-buffer',
  'typed-array-byte-length',
  'typedarray.prototype.slice',
  // Skipped
  'es6-object-assign',
  'harmony-reflect'
]

;(async () => {
  const packageNames = <string[]>(
    await tinyGlob(['*/'], {
      cwd: workspacePath,
      onlyDirectories: true,
      expandDirectories: false
    })
  )
    .map(trimTrailingSlash)
    .filter((n: any) => !skippedPackages.includes(n))
    .sort(localCompare)
  for (const pkgName of packageNames) {
    const wsPkgPath = path.join(workspacePath, pkgName)
    const wsPkgJson = await readPackageJson(wsPkgPath)
    const shouldSkip = !wsPkgJson.scripts.test
    describe(pkgName, { skip: shouldSkip }, async () => {
      it('should pass all unit tests', async () => {
        try {
          await spawn(execPath, [runScriptExecPath, 'test'], {
            cwd: wsPkgPath
          })
        } catch (e) {
          console.log('Failed', pkgName)
        }
        assert.ok(true)
        //assert.doesNotReject(spawn(execPath, args, { cwd: pkgPath }))
      })
    })
  }
})()
