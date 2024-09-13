'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const { LICENSE, ignores } = require('@socketregistry/scripts/constants')
const { localCompare } = require('@socketregistry/scripts/utils/strings')

const rootPath = path.resolve(__dirname, '..')

;(async () => {
  const licenseContent = await fs.readFile(path.join(rootPath, LICENSE), 'utf8')
  const licenseFiles = (
    await tinyGlob([`**/${LICENSE}`], {
      ignore: [LICENSE, ...ignores],
      absolute: true,
      cwd: rootPath
    })
  ).sort(localCompare)
  for (const licensePath of licenseFiles) {
    await fs.writeFile(licensePath, licenseContent, 'utf8')
  }
})()
