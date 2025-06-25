'use strict'

const getDefaultBiomeConfig = () => ({
  __proto__: null,
  $schema: './node_modules/@biomejs/biome/configuration_schema.json',
  formatter: {
    enabled: true,
    attributePosition: 'auto',
    bracketSpacing: true,
    formatWithErrors: false,
    indentStyle: 'space',
    indentWidth: 2,
    lineEnding: 'lf',
    lineWidth: 80,
    useEditorconfig: true
  },
  javascript: {
    formatter: {
      arrowParentheses: 'asNeeded',
      attributePosition: 'auto',
      bracketSameLine: false,
      bracketSpacing: true,
      jsxQuoteStyle: 'double',
      quoteProperties: 'asNeeded',
      quoteStyle: 'single',
      semicolons: 'asNeeded',
      trailingCommas: 'none'
    }
  },
  json: {
    formatter: {
      enabled: true,
      trailingCommas: 'none'
    },
    parser: {
      allowComments: true,
      allowTrailingCommas: true
    }
  },
  linter: {
    rules: {
      style: {
        noParameterAssign: 'error',
        useAsConstAssertion: 'error',
        useDefaultParameterLast: 'error',
        useEnumInitializers: 'error',
        useSelfClosingElements: 'error',
        useSingleVarDeclarator: 'error',
        noUnusedTemplateLiteral: 'error',
        useNumberNamespace: 'error',
        noInferrableTypes: 'error',
        noUselessElse: 'error'
      }
    }
  }
})

let _biome
/*@__NO_SIDE_EFFECTS__*/
async function getBiome() {
  if (_biome === undefined) {
    const { Biome, Distribution } = /*@__PURE__*/ require('@biomejs/js-api')
    _biome = await Biome.create({
      distribution: Distribution.NODE
    })
  }
  return _biome
}

let _path
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path
}

/*@__NO_SIDE_EFFECTS__*/
async function biomeFormat(str, options) {
  const {
    filepath,
    filePath = filepath,
    ...biomeConfig
  } = { __proto__: null, ...options }
  let projectDir = ''
  if (filePath) {
    const path = getPath()
    projectDir = path.dirname(filePath)
  }
  const biome = await getBiome()
  const { projectKey } = biome.openProject(projectDir)
  biome.applyConfiguration(projectKey, {
    __proto__: null,
    ...getDefaultBiomeConfig(),
    ...biomeConfig
  })
  return biome.formatContent(projectKey, str, { __proto__: null, filePath })
    .content
}

module.exports = {
  biomeFormat,
  getBiome,
  getDefaultBiomeConfig
}
