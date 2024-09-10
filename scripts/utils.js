'use strict'

const EMPTY_FILE = '/* empty */'
const LICENSE_SPDX_ID = 'MIT'
const NPM_ORG = 'socketregistry'
const NPM_SCOPE = `@${NPM_ORG}`
const REPO_ORG = 'SocketDev'
const REPO_NAME = 'socket-registry-js'
const VERSION = '1.0.0'

const { compare: localCompare } = new Intl.Collator()

function capitalize(str) {
  const { length } = str
  if (length === 0) return str
  if (length === 1) return str.toUpperCase()
  return str[0].toUpperCase() + str.slice(1)
}

function createPackageJson(pkgName, directory, options = {}) {
  const {
    browser,
    engines,
    dependencies,
    files,
    main,
    overrides,
    sideEffects,
    socket,
    version = VERSION
  } = options
  const name = `${NPM_SCOPE}/${pkgName.replace(new RegExp(`^${escapeRegExp(NPM_SCOPE)}/`), '')}`
  return {
    name,
    version,
    license: LICENSE_SPDX_ID,
    repository: {
      type: 'git',
      url: `https://github.com/${REPO_ORG}/${REPO_NAME}`,
      directory
    },
    ...(browser ? { browser: './index.js' } : {}),
    main: `${main ?? './index.js'}`,
    sideEffects: sideEffects !== undefined && !!sideEffects,
    ...(isObjectObject(dependencies) ? { dependencies } : {}),
    ...(isObjectObject(overrides) ? { overrides, resolutions: overrides } : {}),
    ...(isObjectObject(engines) ? { engines } : {}),
    files: Array.isArray(files) ? files : ['*.d.ts', '*.js'],
    ...(isObjectObject(socket)
      ? { socket }
      : { socket: { category: 'cleanup' } })
  }
}

// Inlined "escape-string-regexp":
// https://www.npmjs.com/package/escape-string-regexp/v/5.0.0
// MIT Licenced
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
function escapeRegExp(string) {
  // Escape characters with special meaning either inside or outside character sets.
  // Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
  return string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d')
}

function formatJsSrc(src) {
  const trimmed = src.trim()
  return trimmed.length ? `'use strict'\n\n${trimmed}\n` : `${EMPTY_FILE}\n`
}

function isObjectObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stripQuotes(str) {
  const { length } = str
  if (length > 1) {
    const first = str.charCodeAt(0)
    const last = str.charCodeAt(length - 1)
    if (
      (first === 39 /*"'"*/ && last === 39) ||
      (first === 34 /*'"'*/ && last === 34)
    ) {
      return str.slice(1, -1)
    }
  }
  return str
}

module.exports = {
  capitalize,
  createPackageJson,
  escapeRegExp,
  formatJsSrc,
  isObjectObject,
  localCompare,
  stripQuotes
}
