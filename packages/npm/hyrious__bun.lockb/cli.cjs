#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const {
  getDefaultLogger,
} = require('@socketsecurity/lib-stable/logger/default')
const { parse } = require('./index.cjs')

const logger = getDefaultLogger()

const rootPath = __dirname

if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  logger.log('')
  logger.log('  Description')
  logger.log('    Parse and print bun.lockb in text format')
  logger.log('')
  logger.log('  Usage')
  logger.log(
    '    $ pnpm exec -p @socketregistry/hyrious__bun.lockb lockb [bun.lockb]',
  )
  logger.log('')
} else if (process.argv[2]?.toLowerCase() === '-v') {
  const pkg = require(
    /* webpackIgnore: true */ path.join(rootPath, 'package.json'),
  )
  logger.log(`${pkg.name}, ${pkg.version}`)
} else {
  const file = process.argv[2] || 'bun.lockb'
  const buffer = fs.readFileSync(file)
  const lockfile = parse(buffer)
  process.stdout.write(lockfile)
}
