/**
 * @fileoverview Consolidated constants for Socket Registry v2.0.
 * All constants are organized into logical groups for better discoverability.
 */

import { platform as osPlatform } from 'node:os'

const isWindows = osPlatform() === 'win32'
const isDarwin = osPlatform() === 'darwin'

// File and directory names
export const files = {
  PACKAGE_JSON: 'package.json',
  PACKAGE_LOCK_JSON: 'package-lock.json',
  NPM_SHRINKWRAP_JSON: 'npm-shrinkwrap.json',
  PNPM_LOCK_YAML: 'pnpm-lock.yaml',
  YARN_LOCK: 'yarn.lock',
  BUN_LOCKB: 'bun.lockb',
  VLT_LOCK_JSON: 'vlt-lock.json',
  TSCONFIG_JSON: 'tsconfig.json',
  GITIGNORE: '.gitignore',
  LICENSE: 'LICENSE',
  README_MD: 'README.md',
  CHANGELOG_MD: 'CHANGELOG.md',
  MANIFEST_JSON: 'manifest.json',
  EXTENSIONS_JSON: 'extensions.json',
  ESLINT_CONFIG_JS: 'eslint.config.js',
} as const

// Directory names
export const dirs = {
  NODE_MODULES: 'node_modules',
  DOT_GIT: '.git',
  DOT_GITHUB: '.github',
  DOT_SOCKET: '.socket',
  CACHE: '.cache',
} as const

// Path constants
export const paths = {
  NODE_MODULES: dirs.NODE_MODULES,
  PACKAGE_JSON: files.PACKAGE_JSON,
  get NODE_MODULES_GLOB(): string {
    return `**/${dirs.NODE_MODULES}`
  },
  get LICENSE_GLOB(): string {
    return 'LICEN[CS]E{,.*}'
  },
  get README_GLOB(): string {
    return 'README{,.*}'
  },
} as const

// Package manager configurations
export const packageManagers = {
  npm: {
    name: 'npm',
    bin: isWindows ? 'npm.cmd' : 'npm',
    lockFile: files.PACKAGE_LOCK_JSON,
    cache: '.npm',
  },
  pnpm: {
    name: 'pnpm',
    bin: isWindows ? 'pnpm.cmd' : 'pnpm',
    lockFile: files.PNPM_LOCK_YAML,
    cache: '.pnpm-store',
  },
  yarn: {
    name: 'yarn',
    bin: isWindows ? 'yarn.cmd' : 'yarn',
    lockFile: files.YARN_LOCK,
    cache: '.yarn',
  },
  bun: {
    name: 'bun',
    bin: 'bun',
    lockFile: files.BUN_LOCKB,
    cache: '.bun',
  },
  vlt: {
    name: 'vlt',
    bin: 'vlt',
    lockFile: files.VLT_LOCK_JSON,
    cache: '.vlt',
  },
} as const

// Node.js flags
export const nodeFlags = {
  HARDEN: [
    '--disable-proto=delete',
    '--experimental-permission',
    '--experimental-policy',
    '--force-node-api-uncaught-exceptions-policy',
  ],
  NO_WARNINGS: ['--no-warnings', '--no-deprecation'],
  DEBUG: [
    '--inspect',
    '--inspect-brk',
    '--inspect-port',
    '--inspect-publish-uid',
  ],
} as const

// Socket-specific constants
export const socket = {
  REGISTRY_SCOPE: '@socketregistry',
  SECURITY_SCOPE: '@socketsecurity',
  OVERRIDE_SCOPE: '@socketoverrides',
  GITHUB_ORG: 'SocketDev',
  REGISTRY_REPO: 'socket-registry',
  REGISTRY_PACKAGE: '@socketsecurity/registry',
  API_BASE_URL: 'https://api.socket.dev',
  PUBLIC_API_TOKEN: 'sktsec_t_--RuUmxJeiLDg8VTLGCLe9w8ESPQ4V5DmNoJQtHH_',
  APP_NAMES: {
    CLI: '@socketsecurity/cli',
    FIREWALL: '@socketsecurity/firewall',
    REGISTRY: '@socketsecurity/registry',
    DLX: '@socketsecurity/dlx',
  },
  IPC_HANDSHAKE: 'socket-ipc-handshake',
} as const

// Environment variables
export const env = {
  NODE_ENV: process.env['NODE_ENV'] || 'production',
  CI: process.env['CI'] === 'true',
  NODE_AUTH_TOKEN: process.env['NODE_AUTH_TOKEN'],
  NPM_TOKEN: process.env['NPM_TOKEN'],
} as const

// File extensions
export const extensions = {
  JS: '.js',
  MJS: '.mjs',
  CJS: '.cjs',
  TS: '.ts',
  MTS: '.mts',
  CTS: '.cts',
  DTS: '.d.ts',
  JSON: '.json',
  YAML: '.yaml',
  YML: '.yml',
  MD: '.md',
  LOCK: '.lock',
  LOCKB: '.lockb',
} as const

// Package categories
export const categories = {
  CLEANUP: 'cleanup',
  LEVELUP: 'levelup',
  SPEEDUP: 'speedup',
  TUNEUP: 'tuneup',
} as const

// Interop types
export const interop = {
  CJS: 'cjs',
  ESM: 'esm',
  BROWSERIFY: 'browserify',
} as const

// Timeouts
export const timeouts = {
  DEFAULT: 30_000,
  INSTALL: 120_000,
  BUILD: 180_000,
  TEST: 60_000,
  FETCH: 15_000,
} as const

// Special values
export const special = {
  EMPTY_VALUE: '',
  UNDEFINED_TOKEN: '__UNDEFINED__',
  UNKNOWN_VALUE: '__UNKNOWN__',
  UNKNOWN_ERROR: 'Unknown error',
  LOOP_SENTINEL: Symbol.for('socket.loop.sentinel'),
  K_INTERNALS: Symbol.for('socket.internals'),
} as const

// Licenses
export const licenses = {
  MIT: 'MIT',
  APACHE_2: 'Apache-2.0',
  BSD_3: 'BSD-3-Clause',
  ISC: 'ISC',
  UNLICENSED: 'UNLICENSED',
  COPY_LEFT: [
    'GPL-2.0',
    'GPL-3.0',
    'AGPL-3.0',
    'LGPL-2.1',
    'LGPL-3.0',
    'MPL-2.0',
    'CC-BY-SA-4.0',
  ],
} as const

// Node.js version support
export const nodeSupport = {
  MINIMUM: '20.0.0',
  MAINTAINED: ['20', '22', '24'],
  get COMPILE_CACHE_API(): boolean {
    return process.versions.node >= '22.8.0'
  },
  get PERMISSION_FLAG(): boolean {
    return process.versions.node >= '20.0.0'
  },
  get REQUIRE_MODULE(): boolean {
    return process.versions.node >= '22.0.0'
  },
  get NODE_RUN(): boolean {
    return process.versions.node >= '22.3.0'
  },
} as const

// NPM registry
export const registry = {
  NPM_URL: 'https://registry.npmjs.org',
  GITHUB_URL: 'https://npm.pkg.github.com',
  SCOPE_DELIMITER: '/',
  AT_LATEST: '@latest',
  DEFAULT_VERSION: '1.0.0',
} as const

// Platform-specific
export const platform = {
  IS_WINDOWS: isWindows,
  IS_DARWIN: isDarwin,
  IS_LINUX: !isWindows && !isDarwin,
  CMD_EXTENSION: isWindows ? '.cmd' : '',
  PS1_EXTENSION: isWindows ? '.ps1' : '',
  PATH_SEP: isWindows ? ';' : ':',
  EOL: isWindows ? '\r\n' : '\n',
} as const

// UTF-8 encoding
export const encoding = {
  UTF8: 'utf8' as const,
  BASE64: 'base64' as const,
  HEX: 'hex' as const,
  BINARY: 'binary' as const,
} as const

// Export all groups
export default {
  categories,
  dirs,
  encoding,
  env,
  extensions,
  files,
  interop,
  licenses,
  nodeFlags,
  nodeSupport,
  packageManagers,
  paths,
  platform,
  registry,
  socket,
  special,
  timeouts,
} as const
