#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const { getDefaultLogger } = require('@socketsecurity/lib-stable/logger/default')
const { parse } = require('./index.cjs')

const logger = getDefaultLogger()

const rootPath = __dirname

if (process.argv[2] === '-h' || process.argv[2] === '--help') {
  logger.log(`
  Description
    Parse and print bun.lockb in text format

  Usage
    $ pnpm exec -p @socketregistry/hyrious__bun.lockb lockb [bun.lockb]
`)
} else if (process.argv[2]?.toLowerCase() === '-v') {
  const pkg = require(
    /* webpackIgnore: true */ path.join(rootPath, 'package.json'),
  )
  console.log(`${pkg.name}, ${pkg.version}`)
} else {
  const file = process.argv[2] || 'bun.lockb'
  const buffer = fs.readFileSync(file)
  const lockfile = parse(buffer)
  process.stdout.write(lockfile)
}
