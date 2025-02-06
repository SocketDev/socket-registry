'use strict'

const DEFAULT_BIOME_CONFIG = {
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
}

let _biome
async function getBiome() {
  if (_biome === undefined) {
    const { Biome, Distribution } = require('@biomejs/js-api')
    _biome = await Biome.create({
      distribution: Distribution.NODE
    })
  }
  return _biome
}

async function biomeFormat(str, options) {
  let {
    filepath,
    filePath = filepath,
    ...biomeConfig
  } = { __proto__: null, ...options }
  const biome = await getBiome()
  biome.applyConfiguration({
    __proto__: null,
    ...DEFAULT_BIOME_CONFIG,
    ...biomeConfig
  })
  return biome.formatContent(str, { filePath }).content
}

function indentString(str, count = 1) {
  return str.replace(/^(?!\s*$)/gm, ' '.repeat(count))
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

function search(str, regexp, fromIndex = 0) {
  const { length } = str
  if (fromIndex >= length) return -1
  if (fromIndex === 0) return str.search(regexp)
  const offset = fromIndex < 0 ? Math.max(length + fromIndex, 0) : fromIndex
  const result = str.slice(offset).search(regexp)
  return result === -1 ? -1 : result + offset
}

function stripBom(str) {
  // In JavaScript, string data is stored as UTF-16, so BOM is 0xFEFF.
  // https://tc39.es/ecma262/#sec-unicode-format-control-characters
  return str.length > 0 && str.charCodeAt(0) === 0xfeff ? str.slice(1) : str
}

module.exports = {
  biomeFormat,
  indentString,
  isNonEmptyString,
  search,
  stripBom
}
