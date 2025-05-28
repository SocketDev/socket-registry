'use strict'

const path = require('node:path')

const { rollup } = require('rollup')
const { glob: tinyGlob } = require('tinyglobby')

const scriptsPath = path.join(__dirname, '..')
const rootPath = path.join(scriptsPath, '..')
const configPath = path.join(rootPath, '.config')
const srcPath = path.join(rootPath, 'src')
const srcExternalPath = path.join(srcPath, 'external')

const getConfig = require(path.join(configPath, 'rollup.base.config.js'))
;(async () => {
  const filepaths = await tinyGlob(['**/*.js'], {
    absolute: true,
    cwd: srcExternalPath
  })
  await Promise.all(
    filepaths.map(async filepath => {
      const relPath = path.relative(srcPath, filepath)
      const bundle = await rollup(getConfig(filepath))
      await bundle.write({
        // Outputs to ./external in root of package.
        file: path.join(rootPath, relPath),
        format: 'cjs',
        sourcemap: false,
        inlineDynamicImports: true
      })
      console.log(`✅ Built ${relPath}`)
    })
  )
})()
