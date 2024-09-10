'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const { createPackageJson } = require('./utils')

const rootPath = path.resolve(__dirname, '..')
const absPackagesPath = path.join(rootPath, 'packages')

;(async () => {
  const ecosystems = await tinyGlob(['*/'], {
    cwd: absPackagesPath,
    onlyDirectories: true,
    expandDirectories: false
  })
  for (const eco_ of ecosystems) {
    const eco = eco_.replace(/[/\\]$/, '')
    if (eco === 'npm') {
      const absEcoPath = path.join(absPackagesPath, eco)
      const pkgJsonGlob = await tinyGlob(['*/package.json'], {
        cwd: absEcoPath
      })
      for await (const relPkgJsonPath of pkgJsonGlob) {
        const absPkgJsonPath = path.join(absEcoPath, relPkgJsonPath)
        const pkgName = path.dirname(relPkgJsonPath)
        const pkgJSON = await fs.readJSON(absPkgJsonPath)
        const { name } = pkgJSON
        const directory = `packages/${eco}/${pkgName}`
        const output = createPackageJson(name, directory, {
          ...pkgJSON
        })
        await fs.writeJSON(absPkgJsonPath, output, { spaces: 2 })
      }
    }
  }
})()
