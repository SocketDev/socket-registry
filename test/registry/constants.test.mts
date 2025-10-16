import { describe, expect, it } from 'vitest'

import {
  BUN,
  BUN_LOCK,
  BUN_LOCKB,
  NPM,
  NPM_REGISTRY_URL,
  NPM_SHRINKWRAP_JSON,
  NPX,
  OVERRIDES,
  PACKAGE_LOCK_JSON,
  PNPM,
  PNPM_LOCK_YAML,
  RESOLUTIONS,
  VLT,
  VLT_LOCK_JSON,
  YARN,
  YARN_BERRY,
  YARN_LOCK,
} from '../../registry/dist/constants/agents.js'
import {
  COLUMN_LIMIT,
  EMPTY_FILE,
  EMPTY_VALUE,
  NODE_AUTH_TOKEN,
  NODE_ENV,
  UNDEFINED_TOKEN,
  UNKNOWN_ERROR,
  UNKNOWN_VALUE,
} from '../../registry/dist/constants/core.js'
import { UTF8 } from '../../registry/dist/constants/encoding.js'
import {
  CACHE_GITHUB_DIR,
  GITHUB_API_BASE_URL,
} from '../../registry/dist/constants/github.js'
import {
  getCopyLeftLicenses,
  MIT,
  UNLICENCED,
  UNLICENSED,
} from '../../registry/dist/constants/licenses.js'
import {
  ESNEXT,
  getExecPath,
  getNodeDebugFlags,
  NODE_SEA_FUSE,
  supportsNodeCompileCacheApi,
  supportsNodeCompileCacheEnvVar,
  supportsNodeDisableWarningFlag,
  supportsNodePermissionFlag,
  supportsNodeRequireModule,
  supportsNodeRun,
  supportsProcessSend,
} from '../../registry/dist/constants/node.js'
import {
  AT_LATEST,
  getLifecycleScriptNames,
  getPacoteCachePath,
  LATEST,
  PACKAGE_DEFAULT_VERSION,
} from '../../registry/dist/constants/packages.js'
import {
  CACHE_DIR,
  CACHE_TTL_DIR,
  CHANGELOG_MD,
  DOT_GIT_DIR,
  DOT_GITHUB,
  DOT_PACKAGE_LOCK_JSON,
  DOT_SOCKET_DIR,
  ESLINT_CONFIG_JS,
  EXT_CJS,
  EXT_CMD,
  EXT_CTS,
  EXT_DTS,
  EXT_JS,
  EXT_JSON,
  EXT_LOCK,
  EXT_LOCKB,
  EXT_MD,
  EXT_MJS,
  EXT_MTS,
  EXT_PS1,
  EXT_YAML,
  EXT_YML,
  EXTENSIONS,
  EXTENSIONS_JSON,
  GITIGNORE,
  LICENSE,
  LICENSE_GLOB,
  LICENSE_GLOB_RECURSIVE,
  LICENSE_ORIGINAL,
  LICENSE_ORIGINAL_GLOB,
  LICENSE_ORIGINAL_GLOB_RECURSIVE,
  MANIFEST_JSON,
  NODE_MODULES,
  NODE_MODULES_GLOB_RECURSIVE,
  PACKAGE_JSON,
  README_GLOB,
  README_GLOB_RECURSIVE,
  README_MD,
  TSCONFIG_JSON,
} from '../../registry/dist/constants/paths.js'
import { DARWIN, WIN32 } from '../../registry/dist/constants/platform.js'
import {
  CACHE_SOCKET_API_DIR,
  REGISTRY,
  SOCKET_API_BASE_URL,
  SOCKET_APP_PREFIX,
  SOCKET_CLI_APP_NAME,
  SOCKET_DLX_APP_NAME,
  SOCKET_FIREWALL_APP_NAME,
  SOCKET_GITHUB_ORG,
  SOCKET_IPC_HANDSHAKE,
  SOCKET_OVERRIDE_SCOPE,
  SOCKET_PUBLIC_API_TOKEN,
  SOCKET_REGISTRY_APP_NAME,
  SOCKET_REGISTRY_NPM_ORG,
  SOCKET_REGISTRY_PACKAGE_NAME,
  SOCKET_REGISTRY_REPO_NAME,
  SOCKET_REGISTRY_SCOPE,
  SOCKET_SECURITY_SCOPE,
} from '../../registry/dist/constants/socket.js'
import {
  CI,
  PRE_COMMIT,
  VITEST,
} from '../../registry/dist/constants/testing.js'
import { DLX_BINARY_CACHE_TTL } from '../../registry/dist/constants/time.js'
import {
  getTsLibsAvailable,
  getTsTypesAvailable,
} from '../../registry/dist/constants/typescript.js'

import { npm_lifecycle_event as npmLifecycleEvent } from '../../registry/dist/env/npm-lifecycle-event.js'

const copyLeftLicenses = getCopyLeftLicenses()
const execPath = getExecPath()
const lifecycleScriptNames = getLifecycleScriptNames()
const nodeDebugFlags = getNodeDebugFlags()
const pacoteCachePath = getPacoteCachePath()
const SUPPORTS_NODE_COMPILE_CACHE_API = supportsNodeCompileCacheApi()
const SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR = supportsNodeCompileCacheEnvVar()
const SUPPORTS_NODE_DISABLE_WARNING_FLAG = supportsNodeDisableWarningFlag()
const SUPPORTS_NODE_PERMISSION_FLAG = supportsNodePermissionFlag()
const SUPPORTS_NODE_REQUIRE_MODULE = supportsNodeRequireModule()
const SUPPORTS_NODE_RUN = supportsNodeRun()
const SUPPORTS_PROCESS_SEND = supportsProcessSend()
const tsLibsAvailable = getTsLibsAvailable()
const tsTypesAvailable = getTsTypesAvailable()

describe('constants module', () => {
  describe('basic string constants', () => {
    const stringConstants = [
      { name: 'AT_LATEST', value: AT_LATEST, expected: '@latest' },
      { name: 'BUN', value: BUN, expected: 'bun' },
      { name: 'BUN_LOCK', value: BUN_LOCK, expected: 'bun.lock' },
      { name: 'BUN_LOCKB', value: BUN_LOCKB, expected: 'bun.lockb' },
      { name: 'CACHE_DIR', value: CACHE_DIR, expected: 'cache' },
      { name: 'CACHE_GITHUB_DIR', value: CACHE_GITHUB_DIR, expected: 'github' },
      {
        name: 'CACHE_SOCKET_API_DIR',
        value: CACHE_SOCKET_API_DIR,
        expected: 'socket-api',
      },
      { name: 'CACHE_TTL_DIR', value: CACHE_TTL_DIR, expected: 'ttl' },
      { name: 'CHANGELOG_MD', value: CHANGELOG_MD, expected: 'CHANGELOG.md' },
      { name: 'CI', value: CI, expected: 'CI' },
      { name: 'DOT_GITHUB', value: DOT_GITHUB, expected: '.github' },
      { name: 'DOT_GIT_DIR', value: DOT_GIT_DIR, expected: '.git' },
      {
        name: 'DOT_PACKAGE_LOCK_JSON',
        value: DOT_PACKAGE_LOCK_JSON,
        expected: '.package-lock.json',
      },
      { name: 'DOT_SOCKET_DIR', value: DOT_SOCKET_DIR, expected: '.socket' },
      {
        name: 'ESLINT_CONFIG_JS',
        value: ESLINT_CONFIG_JS,
        expected: 'eslint.config.js',
      },
      { name: 'ESNEXT', value: ESNEXT, expected: 'esnext' },
      { name: 'EXTENSIONS', value: EXTENSIONS, expected: 'extensions' },
      {
        name: 'EXTENSIONS_JSON',
        value: EXTENSIONS_JSON,
        expected: 'extensions.json',
      },
      { name: 'EXT_CJS', value: EXT_CJS, expected: '.cjs' },
      { name: 'EXT_CMD', value: EXT_CMD, expected: '.cmd' },
      { name: 'EXT_CTS', value: EXT_CTS, expected: '.cts' },
      { name: 'EXT_DTS', value: EXT_DTS, expected: '.d.ts' },
      { name: 'EXT_JS', value: EXT_JS, expected: '.js' },
      { name: 'EXT_JSON', value: EXT_JSON, expected: '.json' },
      { name: 'EXT_LOCK', value: EXT_LOCK, expected: '.lock' },
      { name: 'EXT_LOCKB', value: EXT_LOCKB, expected: '.lockb' },
      { name: 'EXT_MD', value: EXT_MD, expected: '.md' },
      { name: 'EXT_MJS', value: EXT_MJS, expected: '.mjs' },
      { name: 'EXT_MTS', value: EXT_MTS, expected: '.mts' },
      { name: 'EXT_PS1', value: EXT_PS1, expected: '.ps1' },
      { name: 'EXT_YAML', value: EXT_YAML, expected: '.yaml' },
      { name: 'EXT_YML', value: EXT_YML, expected: '.yml' },
      { name: 'GITIGNORE', value: GITIGNORE, expected: '.gitignore' },
      {
        name: 'GITHUB_API_BASE_URL',
        value: GITHUB_API_BASE_URL,
        expected: 'https://api.github.com',
      },
      { name: 'LATEST', value: LATEST, expected: 'latest' },
      { name: 'LICENSE', value: LICENSE, expected: 'LICENSE' },
      {
        name: 'LICENSE_ORIGINAL',
        value: LICENSE_ORIGINAL,
        expected: 'LICENSE.original',
      },
      {
        name: 'MANIFEST_JSON',
        value: MANIFEST_JSON,
        expected: 'manifest.json',
      },
      { name: 'MIT', value: MIT, expected: 'MIT' },
      { name: 'NODE_ENV', value: NODE_ENV, expected: 'NODE_ENV' },
      { name: 'NODE_MODULES', value: NODE_MODULES, expected: 'node_modules' },
      {
        name: 'NODE_SEA_FUSE',
        value: NODE_SEA_FUSE,
        expected: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
      },
      { name: 'NPM', value: NPM, expected: 'npm' },
      {
        name: 'NPM_SHRINKWRAP_JSON',
        value: NPM_SHRINKWRAP_JSON,
        expected: 'npm-shrinkwrap.json',
      },
      { name: 'NPX', value: NPX, expected: 'npx' },
      { name: 'OVERRIDES', value: OVERRIDES, expected: 'overrides' },
      {
        name: 'PACKAGE_DEFAULT_VERSION',
        value: PACKAGE_DEFAULT_VERSION,
        expected: '1.0.0',
      },
      { name: 'PACKAGE_JSON', value: PACKAGE_JSON, expected: 'package.json' },
      {
        name: 'PACKAGE_LOCK_JSON',
        value: PACKAGE_LOCK_JSON,
        expected: 'package-lock.json',
      },
      { name: 'PNPM', value: PNPM, expected: 'pnpm' },
      {
        name: 'PNPM_LOCK_YAML',
        value: PNPM_LOCK_YAML,
        expected: 'pnpm-lock.yaml',
      },
      { name: 'PRE_COMMIT', value: PRE_COMMIT, expected: 'PRE_COMMIT' },
      { name: 'README_MD', value: README_MD, expected: 'README.md' },
      { name: 'REGISTRY', value: REGISTRY, expected: 'registry' },
      { name: 'RESOLUTIONS', value: RESOLUTIONS, expected: 'resolutions' },
      {
        name: 'SOCKET_API_BASE_URL',
        value: SOCKET_API_BASE_URL,
        expected: 'https://api.socket.dev/v0',
      },
      { name: 'SOCKET_APP_PREFIX', value: SOCKET_APP_PREFIX, expected: '_' },
      {
        name: 'SOCKET_CLI_APP_NAME',
        value: SOCKET_CLI_APP_NAME,
        expected: 'socket',
      },
      {
        name: 'SOCKET_DLX_APP_NAME',
        value: SOCKET_DLX_APP_NAME,
        expected: 'dlx',
      },
      {
        name: 'SOCKET_FIREWALL_APP_NAME',
        value: SOCKET_FIREWALL_APP_NAME,
        expected: 'sfw',
      },
      {
        name: 'SOCKET_GITHUB_ORG',
        value: SOCKET_GITHUB_ORG,
        expected: 'SocketDev',
      },
      {
        name: 'SOCKET_REGISTRY_APP_NAME',
        value: SOCKET_REGISTRY_APP_NAME,
        expected: 'registry',
      },
      {
        name: 'SOCKET_REGISTRY_REPO_NAME',
        value: SOCKET_REGISTRY_REPO_NAME,
        expected: 'socket-registry',
      },
      {
        name: 'SOCKET_REGISTRY_SCOPE',
        value: SOCKET_REGISTRY_SCOPE,
        expected: '@socketregistry',
      },
      {
        name: 'SOCKET_SECURITY_SCOPE',
        value: SOCKET_SECURITY_SCOPE,
        expected: '@socketsecurity',
      },
      {
        name: 'TSCONFIG_JSON',
        value: TSCONFIG_JSON,
        expected: 'tsconfig.json',
      },
      {
        name: 'UNKNOWN_ERROR',
        value: UNKNOWN_ERROR,
        expected: 'Unknown error',
      },
      { name: 'UNLICENCED', value: UNLICENCED, expected: 'UNLICENCED' },
      { name: 'UNLICENSED', value: UNLICENSED, expected: 'UNLICENSED' },
      { name: 'UTF8', value: UTF8, expected: 'utf8' },
      { name: 'VITEST', value: VITEST, expected: 'VITEST' },
      { name: 'VLT', value: VLT, expected: 'vlt' },
      {
        name: 'VLT_LOCK_JSON',
        value: VLT_LOCK_JSON,
        expected: 'vlt-lock.json',
      },
      { name: 'YARN', value: YARN, expected: 'yarn' },
      { name: 'YARN_BERRY', value: YARN_BERRY, expected: 'yarn/berry' },
      { name: 'YARN_LOCK', value: YARN_LOCK, expected: 'yarn.lock' },
    ]

    it('should export string constants with correct values', () => {
      for (const { expected, value } of stringConstants) {
        expect(value).toBe(expected)
      }
    })
  })

  describe('boolean constants', () => {
    const booleanConstants = [
      { name: 'DARWIN', value: DARWIN },
      {
        name: 'SUPPORTS_NODE_COMPILE_CACHE_API',
        value: SUPPORTS_NODE_COMPILE_CACHE_API,
      },
      {
        name: 'SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR',
        value: SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR,
      },
      {
        name: 'SUPPORTS_NODE_DISABLE_WARNING_FLAG',
        value: SUPPORTS_NODE_DISABLE_WARNING_FLAG,
      },
      {
        name: 'SUPPORTS_NODE_PERMISSION_FLAG',
        value: SUPPORTS_NODE_PERMISSION_FLAG,
      },
      {
        name: 'SUPPORTS_NODE_REQUIRE_MODULE',
        value: SUPPORTS_NODE_REQUIRE_MODULE,
      },
      { name: 'SUPPORTS_NODE_RUN', value: SUPPORTS_NODE_RUN },
      { name: 'SUPPORTS_PROCESS_SEND', value: SUPPORTS_PROCESS_SEND },
      { name: 'WIN32', value: WIN32 },
    ]

    it('should export boolean constants', () => {
      for (const { value } of booleanConstants) {
        expect(typeof value).toBe('boolean')
      }
    })
  })

  describe('number constants', () => {
    const numberConstants = [
      { name: 'COLUMN_LIMIT', value: COLUMN_LIMIT },
      { name: 'DLX_BINARY_CACHE_TTL', value: DLX_BINARY_CACHE_TTL },
    ]

    it('should export number constants', () => {
      for (const { value } of numberConstants) {
        expect(typeof value).toBe('number')
        expect(value).toBeGreaterThan(0)
      }
    })
  })

  describe('special constants', () => {
    it('should export string token constants', () => {
      expect(typeof NODE_AUTH_TOKEN).toBe('string')
      expect(typeof EMPTY_FILE).toBe('string')
      expect(typeof EMPTY_VALUE).toBe('string')
      expect(typeof SOCKET_IPC_HANDSHAKE).toBe('string')
      expect(typeof SOCKET_OVERRIDE_SCOPE).toBe('string')
      expect(typeof SOCKET_PUBLIC_API_TOKEN).toBe('string')
      expect(typeof SOCKET_REGISTRY_NPM_ORG).toBe('string')
      expect(typeof SOCKET_REGISTRY_PACKAGE_NAME).toBe('string')
      expect(typeof UNKNOWN_VALUE).toBe('string')
    })

    it('should export UNDEFINED_TOKEN', () => {
      expect(typeof UNDEFINED_TOKEN).toBe('object')
      expect(UNDEFINED_TOKEN).not.toBe(null)
    })

    it('should export copy-left licenses Set', () => {
      expect(copyLeftLicenses instanceof Set).toBe(true)
      expect(copyLeftLicenses.size).toBeGreaterThan(0)
    })
  })

  describe('glob pattern constants', () => {
    it('should export license glob patterns', () => {
      expect(LICENSE_GLOB).toContain('LICEN')
      expect(LICENSE_GLOB_RECURSIVE).toContain('LICEN')
      expect(typeof LICENSE_ORIGINAL_GLOB).toBe('string')
      expect(typeof LICENSE_ORIGINAL_GLOB_RECURSIVE).toBe('string')
    })

    it('should export readme glob patterns', () => {
      expect(README_GLOB).toContain('README')
      expect(README_GLOB_RECURSIVE).toContain('README')
    })

    it('should export node_modules glob pattern', () => {
      expect(NODE_MODULES_GLOB_RECURSIVE).toContain('node_modules')
    })

    it('should export npm registry URL', () => {
      expect(NPM_REGISTRY_URL).toContain('registry.npmjs.org')
    })
  })

  describe('complex constants', () => {
    it('should export lifecycle script names array', () => {
      expect(Array.isArray(lifecycleScriptNames)).toBe(true)
      expect(lifecycleScriptNames.length).toBeGreaterThan(0)
      expect(lifecycleScriptNames.includes('install')).toBe(true)
    })

    it('should export npm lifecycle event', () => {
      expect(['string', 'undefined']).toContain(typeof npmLifecycleEvent)
    })

    it('should export exec path', () => {
      expect(typeof execPath).toBe('string')
      expect(execPath.length).toBeGreaterThan(0)
    })

    it('should export node debug flags array', () => {
      expect(Array.isArray(nodeDebugFlags)).toBe(true)
    })

    it('should export TypeScript library availability booleans', () => {
      expect(typeof tsLibsAvailable).toBe('boolean')
      expect(typeof tsTypesAvailable).toBe('boolean')
    })
  })

  describe('package defaults', () => {
    it('should export package default socket categories', () => {
      const categories = require('../../registry/dist/lib/constants/package-default-socket-categories')
      expect(Array.isArray(categories)).toBe(true)
    })

    it('should export registry scope delimiter', () => {
      const delimiter = require('../../registry/dist/lib/constants/REGISTRY_SCOPE_DELIMITER')
      expect(delimiter).toBe('__')
    })
  })

  describe('packument cache', () => {
    it('should export packument cache Map', () => {
      const cache = require('../../registry/dist/lib/constants/packument-cache')
      expect(cache instanceof Map).toBe(true)
    })
  })

  describe('package manager paths', () => {
    it('should export pacoteCachePath', () => {
      expect(typeof pacoteCachePath).toBe('string')
    })
  })
})
