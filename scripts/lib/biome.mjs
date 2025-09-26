/**
 * @fileoverview Biome code formatter configuration and utilities.
 * Provides default Biome configuration and formatting helpers for the registry.
 */
'use strict'

import path from 'node:path'

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
    useEditorconfig: true,
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
      trailingCommas: 'none',
    },
  },
  json: {
    formatter: {
      enabled: true,
      trailingCommas: 'none',
    },
    parser: {
      allowComments: true,
      allowTrailingCommas: true,
    },
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
        noUselessElse: 'error',
      },
    },
  },
})

let _biome
async function getBiome() {
  if (_biome === undefined) {
    const { Biome, Distribution } = await import('@biomejs/js-api')
    _biome = await Biome.create({
      distribution: Distribution.NODE,
    })
  }
  return _biome
}

async function biomeFormat(str, options) {
  const {
    filepath,
    filePath = filepath,
    ...biomeConfig
  } = { __proto__: null, ...options }
  let projectDir = ''
  if (filePath) {
    projectDir = path.dirname(filePath)
  }
  const biome = await getBiome()
  const { projectKey } = biome.openProject(projectDir)
  biome.applyConfiguration(projectKey, {
    __proto__: null,
    ...getDefaultBiomeConfig(),
    ...biomeConfig,
  })
  return biome.formatContent(projectKey, str, { __proto__: null, filePath })
    .content
}

export { biomeFormat, getBiome, getDefaultBiomeConfig }
