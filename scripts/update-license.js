'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const { ignores } = require('./constants')

const rootPath = path.resolve(__dirname, '..')

const LICENSE = 'LICENSE'

;(async () => {
  const licenseContent = await fs.readFile(path.join(rootPath, LICENSE), 'utf8')
  const licenseFiles = await tinyGlob([`**/${LICENSE}`], {
    ignore: [LICENSE, ...ignores],
    absolute: true,
    cwd: rootPath,
    onlyFiles: true
  })
  for (const licensePath of licenseFiles) {
    await fs.writeFile(licensePath, licenseContent, 'utf8')
  }
})()
