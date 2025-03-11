'use strict'

const fs = require('node:fs/promises')
const util = require('node:util')

const YAML = require('@zkochan/js-yaml')
const readYamlFile = require('read-yaml-file')

const constants = require('@socketregistry/scripts/constants')
const { isModified } = require('@socketregistry/scripts/lib/git')

const { UTF8, tapCiConfigPath, tapConfigPath } = constants

const { values: cliArgs } = util.parseArgs(constants.parseArgsConfig)

void (async () => {
  // Exit early if no relevant files have been modified.
  // Lazily access constants.ENV.
  if (
    !cliArgs.force &&
    !constants.ENV.CI &&
    !(await isModified(tapConfigPath))
  ) {
    return
  }
  const config = await readYamlFile(tapConfigPath)
  const content = `# This file is auto-generated by 'npm run update:tap-config'\n${YAML.dump(
    {
      ...config,
      passes: true
    }
  )}`
  await fs.writeFile(tapCiConfigPath, content, UTF8)
})()
