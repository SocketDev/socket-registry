'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { PackageURL } = require('packageurl-js')
const prettier = require('prettier')
const { glob: tinyGlob } = require('tinyglobby')

const { trimTrailingSlash } = require('@socketregistry/scripts/utils/path')
const { readPackageJson } = require('@socketregistry/scripts/utils/fs')
const { localCompare } = require('@socketregistry/scripts/utils/sorts')

const rootPath = path.resolve(__dirname, '..')
const rootPackagesPath = path.join(rootPath, 'packages')

;(async () => {
  const ecosystems = (
    await tinyGlob(['*/'], {
      cwd: rootPackagesPath,
      onlyDirectories: true,
      expandDirectories: false
    })
  )
    .map(trimTrailingSlash)
    .sort(localCompare)
  const manifest = {}
  for (const eco of ecosystems) {
    if (eco === 'npm') {
      const npmPackagesPath = path.join(rootPackagesPath, eco)
      const packageNames = (
        await tinyGlob(['*/'], {
          cwd: npmPackagesPath,
          onlyDirectories: true,
          expandDirectories: false
        })
      )
        .map(trimTrailingSlash)
        .sort(localCompare)
      const manifestData = []
      for await (const pkgName of packageNames) {
        const pkgPath = path.join(npmPackagesPath, pkgName)
        const { browser, engines, name, socket, version } =
          await readPackageJson(pkgPath)
        const purlObj = PackageURL.fromString(`pkg:${eco}/${name}@${version}`)
        const data = [purlObj.toString()]
        const metaEntries = [
          ...(browser ? [['browser', true]] : []),
          ...(engines ? [['engines', engines]] : []),
          ...(socket ? Object.entries(socket) : [])
        ]
        if (metaEntries.length) {
          data[1] = Object.fromEntries(
            metaEntries.sort((a, b) => localCompare(a[0], b[0]))
          )
        }
        manifestData.push(data.length === 1 ? data[0] : data)
      }
      if (manifestData.length) {
        manifest[eco] = manifestData.sort((a_, b_) => {
          const a = Array.isArray(a_) ? a_[0] : a_
          const b = Array.isArray(b_) ? b_[0] : b_
          return localCompare(a, b)
        })
      }
    }
  }
  const output = await prettier.format(JSON.stringify(manifest), {
    parser: 'json'
  })
  await fs.writeFile(path.join(rootPath, 'manifest.json'), output, 'utf8')
})()
