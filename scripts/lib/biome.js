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

/*@__NO_SIDE_EFFECTS__*/
async function biomeFormat(str, options) {
  const {
    filepath,
    filePath = filepath,
    ...biomeConfig
  } = { __proto__: null, ...options }
  const biome = await getBiome()
  biome.applyConfiguration({
    __proto__: null,
    ...getDefaultBiomeConfig(),
    ...biomeConfig
  })
  return biome.formatContent(str, { filePath }).content
}

module.exports = {
  biomeFormat,
  getBiome,
  getDefaultBiomeConfig
}
