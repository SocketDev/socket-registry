'use strict'

const path = require('node:path')

const { Eta } = require('eta')
const fs = require('fs-extra')
const { PackageURL } = require('packageurl-js')
const semver = require('semver')
const { glob: tinyGlob } = require('tinyglobby')

const manifest = require('@socketregistry/manifest')
const constants = require('@socketregistry/scripts/constants')
const { LICENSE_CONTENT, PACKAGE_JSON, README_MD, npmTemplatesPath } = constants
const { globLicenses } = require('@socketregistry/scripts/utils/globs')
const { readPackageJson } = require('@socketregistry/scripts/utils/packages')
const { prettierFormat } = require('@socketregistry/scripts/utils/strings')

const eta = new Eta()

const templates = Object.freeze({
  __proto__: null,
  ...Object.fromEntries(
    [
      'default',
      'es-shim-prototype-method',
      'es-shim-static-method',
      'node-cjs',
      'node-cjs+browser',
      'node-esm',
      'node-esm+browser'
    ].map(k => [k, path.join(npmTemplatesPath, k)])
  )
})

const templateChoices = Object.freeze({
  __proto__: null,
  esShim: [
    { name: 'es-shim prototype method', value: 'es-shim-prototype-method' },
    { name: 'es-shim static method', value: 'es-shim-static-method' }
  ],
  nodeCjs: [
    { name: 'node cjs', value: 'node-cjs' },
    { name: 'node cjs plus browser', value: 'node-cjs+browser' }
  ],
  nodeEsm: [
    { name: 'node esm', value: 'node-esm' },
    { name: 'node esm plus browser', value: 'node-esm+browser' }
  ]
})

function prepareTemplate(content, data) {
  return (
    content
      // Replace tags that look like ["<%...%>"] with [<%...%>] when data is an
      // array. Enquoting the tags avoids syntax errors in JSON template files.
      .replace(/\["<%([-_]|)~([\s\S]+)%>"\]/g, (match, startWsc, it) => {
        const lastCode = it.charCodeAt(it.length - 1)
        const isEndWsc = lastCode === 45 /*'-'*/ || lastCode === 95 /*'_'*/
        const endWsc = isEndWsc ? it.at(-1) : ''
        const itTrimmed = (isEndWsc ? it.slice(0, -1) : it).trim()
        const itParts = itTrimmed.split('.')
        const name = itParts[0] === 'it' ? itParts?.[1] : itParts[0]
        return name && Array.isArray(data[name])
          ? `<%${startWsc}~ JSON.stringify(${itTrimmed}) ${endWsc}%>`
          : match
      })
  )
}

async function getLicenseActions(pkgPath) {
  const licenseData = {
    __proto__: null,
    license: LICENSE_CONTENT.trim()
  }
  const actions = []
  for (const filepath of await globLicenses(pkgPath, { recursive: true })) {
    actions.push([filepath, licenseData])
  }
  return actions
}

async function getNpmReadmeAction(pkgPath) {
  const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
  const pkgJson = await readPackageJson(pkgJsonPath)
  const pkgPurlObj = PackageURL.fromString(
    `pkg:npm/${pkgJson.name}@${pkgJson.version}`
  )
  const { name: pkgName } = pkgPurlObj
  const manifestData =
    manifest.npm.find(
      ({ 0: purlStr }) => PackageURL.fromString(purlStr).name === pkgName
    )?.[1] ?? {}
  return [
    path.join(pkgPath, README_MD),
    {
      __proto__: null,
      readme: await renderAction([
        path.join(npmTemplatesPath, README_MD),
        {
          __proto__: null,
          ...pkgJson,
          manifest: manifestData,
          originalName: `${manifestData?.scope ?? ''}${pkgName}`,
          purl: pkgPurlObj,
          version: semver.parse(pkgJson.version)
        }
      ])
    }
  ]
}

async function getPackageJsonAction(pkgPath, nodeRange) {
  return [
    path.join(pkgPath, PACKAGE_JSON),
    {
      __proto__: null,
      name: path.basename(pkgPath),
      // Lazily access constants.PACKAGE_DEFAULT_VERSION.
      version: semver.parse(constants.PACKAGE_DEFAULT_VERSION),
      // Lazily access constants.PACKAGE_DEFAULT_NODE_RANGE.
      node_range: nodeRange ?? constants.PACKAGE_DEFAULT_NODE_RANGE,
      categories: ['cleanup']
    }
  ]
}

async function getTypeScriptActions(pkgPath, tsLib) {
  const tsData = {
    __proto__: null,
    ts_lib: tsLib
  }
  const actions = []
  for (const filepath of await tinyGlob(['**/*.ts'], {
    absolute: true,
    cwd: pkgPath
  })) {
    actions.push([filepath, tsData])
  }
  return actions
}

async function renderAction(action) {
  const { 0: filepath, 1: dataRaw } = action
  const data = typeof dataRaw === 'function' ? await dataRaw() : dataRaw
  const ext = path.extname(filepath)
  const content = await fs.readFile(filepath, 'utf8')
  const prepared = prepareTemplate(content, data)
  const modified = await eta.renderStringAsync(prepared, data)
  return ext === '.json' || ext === '.md'
    ? await prettierFormat(modified, { filepath })
    : modified
}

async function writeAction(action) {
  const { 0: filepath } = action
  return await fs.writeFile(filepath, await renderAction(action), 'utf8')
}

module.exports = {
  getLicenseActions,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTypeScriptActions,
  renderAction,
  templates,
  templateChoices,
  writeAction
}
