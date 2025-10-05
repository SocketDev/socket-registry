import { describe, expect, it } from 'vitest'

import AT_LATEST from '../../registry/dist/lib/constants/AT_LATEST.js'
import BUN from '../../registry/dist/lib/constants/BUN.js'
import BUN_LOCK from '../../registry/dist/lib/constants/BUN_LOCK.js'
import BUN_LOCKB from '../../registry/dist/lib/constants/BUN_LOCKB.js'
import CACHE_DIR from '../../registry/dist/lib/constants/CACHE_DIR.js'
import CACHE_GITHUB_DIR from '../../registry/dist/lib/constants/CACHE_GITHUB_DIR.js'
import CACHE_SOCKET_API_DIR from '../../registry/dist/lib/constants/CACHE_SOCKET_API_DIR.js'
import CACHE_TTL_DIR from '../../registry/dist/lib/constants/CACHE_TTL_DIR.js'
import CHANGELOG_MD from '../../registry/dist/lib/constants/CHANGELOG_MD.js'
import CI from '../../registry/dist/lib/constants/CI.js'
import COLUMN_LIMIT from '../../registry/dist/lib/constants/COLUMN_LIMIT.js'
import DARWIN from '../../registry/dist/lib/constants/DARWIN.js'
import DLX_BINARY_CACHE_TTL from '../../registry/dist/lib/constants/DLX_BINARY_CACHE_TTL.js'
import DOT_GITHUB from '../../registry/dist/lib/constants/DOT_GITHUB.js'
import DOT_GIT_DIR from '../../registry/dist/lib/constants/DOT_GIT_DIR.js'
import DOT_PACKAGE_LOCK_JSON from '../../registry/dist/lib/constants/DOT_PACKAGE_LOCK_JSON.js'
import DOT_SOCKET_DIR from '../../registry/dist/lib/constants/DOT_SOCKET_DIR.js'
import EMPTY_FILE from '../../registry/dist/lib/constants/EMPTY_FILE.js'
import EMPTY_VALUE from '../../registry/dist/lib/constants/EMPTY_VALUE.js'
import ESLINT_CONFIG_JS from '../../registry/dist/lib/constants/ESLINT_CONFIG_JS.js'
import ESNEXT from '../../registry/dist/lib/constants/ESNEXT.js'
import EXTENSIONS from '../../registry/dist/lib/constants/EXTENSIONS.js'
import EXTENSIONS_JSON from '../../registry/dist/lib/constants/EXTENSIONS_JSON.js'
import EXT_CJS from '../../registry/dist/lib/constants/EXT_CJS.js'
import EXT_CMD from '../../registry/dist/lib/constants/EXT_CMD.js'
import EXT_CTS from '../../registry/dist/lib/constants/EXT_CTS.js'
import EXT_DTS from '../../registry/dist/lib/constants/EXT_DTS.js'
import EXT_JS from '../../registry/dist/lib/constants/EXT_JS.js'
import EXT_JSON from '../../registry/dist/lib/constants/EXT_JSON.js'
import EXT_LOCK from '../../registry/dist/lib/constants/EXT_LOCK.js'
import EXT_LOCKB from '../../registry/dist/lib/constants/EXT_LOCKB.js'
import EXT_MD from '../../registry/dist/lib/constants/EXT_MD.js'
import EXT_MJS from '../../registry/dist/lib/constants/EXT_MJS.js'
import EXT_MTS from '../../registry/dist/lib/constants/EXT_MTS.js'
import EXT_PS1 from '../../registry/dist/lib/constants/EXT_PS1.js'
import EXT_YAML from '../../registry/dist/lib/constants/EXT_YAML.js'
import EXT_YML from '../../registry/dist/lib/constants/EXT_YML.js'
import GITHUB_API_BASE_URL from '../../registry/dist/lib/constants/GITHUB_API_BASE_URL.js'
import GITIGNORE from '../../registry/dist/lib/constants/GITIGNORE.js'
import LATEST from '../../registry/dist/lib/constants/LATEST.js'
import LICENSE from '../../registry/dist/lib/constants/LICENSE.js'
import LICENSE_GLOB from '../../registry/dist/lib/constants/LICENSE_GLOB.js'
import LICENSE_GLOB_RECURSIVE from '../../registry/dist/lib/constants/LICENSE_GLOB_RECURSIVE.js'
import LICENSE_ORIGINAL from '../../registry/dist/lib/constants/LICENSE_ORIGINAL.js'
import LICENSE_ORIGINAL_GLOB from '../../registry/dist/lib/constants/LICENSE_ORIGINAL_GLOB.js'
import LICENSE_ORIGINAL_GLOB_RECURSIVE from '../../registry/dist/lib/constants/LICENSE_ORIGINAL_GLOB_RECURSIVE.js'
import MANIFEST_JSON from '../../registry/dist/lib/constants/MANIFEST_JSON.js'
import MIT from '../../registry/dist/lib/constants/MIT.js'
import NODE_AUTH_TOKEN from '../../registry/dist/lib/constants/NODE_AUTH_TOKEN.js'
import NODE_ENV from '../../registry/dist/lib/constants/NODE_ENV.js'
import NODE_MODULES from '../../registry/dist/lib/constants/NODE_MODULES.js'
import NODE_MODULES_GLOB_RECURSIVE from '../../registry/dist/lib/constants/NODE_MODULES_GLOB_RECURSIVE.js'
import NODE_SEA_FUSE from '../../registry/dist/lib/constants/NODE_SEA_FUSE.js'
import NPM from '../../registry/dist/lib/constants/NPM.js'
import NPM_REGISTRY_URL from '../../registry/dist/lib/constants/NPM_REGISTRY_URL.js'
import NPM_SHRINKWRAP_JSON from '../../registry/dist/lib/constants/NPM_SHRINKWRAP_JSON.js'
import NPX from '../../registry/dist/lib/constants/NPX.js'
import OVERRIDES from '../../registry/dist/lib/constants/OVERRIDES.js'
import PACKAGE_DEFAULT_VERSION from '../../registry/dist/lib/constants/PACKAGE_DEFAULT_VERSION.js'
import PACKAGE_JSON from '../../registry/dist/lib/constants/PACKAGE_JSON.js'
import PACKAGE_LOCK_JSON from '../../registry/dist/lib/constants/PACKAGE_LOCK_JSON.js'
import PNPM from '../../registry/dist/lib/constants/PNPM.js'
import PNPM_LOCK_YAML from '../../registry/dist/lib/constants/PNPM_LOCK_YAML.js'
import PRE_COMMIT from '../../registry/dist/lib/constants/PRE_COMMIT.js'
import README_GLOB from '../../registry/dist/lib/constants/README_GLOB.js'
import README_GLOB_RECURSIVE from '../../registry/dist/lib/constants/README_GLOB_RECURSIVE.js'
import README_MD from '../../registry/dist/lib/constants/README_MD.js'
import REGISTRY from '../../registry/dist/lib/constants/REGISTRY.js'
import RESOLUTIONS from '../../registry/dist/lib/constants/RESOLUTIONS.js'
import SOCKET_API_BASE_URL from '../../registry/dist/lib/constants/SOCKET_API_BASE_URL.js'
import SOCKET_APP_PREFIX from '../../registry/dist/lib/constants/SOCKET_APP_PREFIX.js'
import SOCKET_CLI_APP_NAME from '../../registry/dist/lib/constants/SOCKET_CLI_APP_NAME.js'
import SOCKET_DLX_APP_NAME from '../../registry/dist/lib/constants/SOCKET_DLX_APP_NAME.js'
import SOCKET_FIREWALL_APP_NAME from '../../registry/dist/lib/constants/SOCKET_FIREWALL_APP_NAME.js'
import SOCKET_GITHUB_ORG from '../../registry/dist/lib/constants/SOCKET_GITHUB_ORG.js'
import SOCKET_IPC_HANDSHAKE from '../../registry/dist/lib/constants/SOCKET_IPC_HANDSHAKE.js'
import SOCKET_OVERRIDE_SCOPE from '../../registry/dist/lib/constants/SOCKET_OVERRIDE_SCOPE.js'
import SOCKET_PUBLIC_API_TOKEN from '../../registry/dist/lib/constants/SOCKET_PUBLIC_API_TOKEN.js'
import SOCKET_REGISTRY_APP_NAME from '../../registry/dist/lib/constants/SOCKET_REGISTRY_APP_NAME.js'
import SOCKET_REGISTRY_NPM_ORG from '../../registry/dist/lib/constants/SOCKET_REGISTRY_NPM_ORG.js'
import SOCKET_REGISTRY_PACKAGE_NAME from '../../registry/dist/lib/constants/SOCKET_REGISTRY_PACKAGE_NAME.js'
import SOCKET_REGISTRY_REPO_NAME from '../../registry/dist/lib/constants/SOCKET_REGISTRY_REPO_NAME.js'
import SOCKET_REGISTRY_SCOPE from '../../registry/dist/lib/constants/SOCKET_REGISTRY_SCOPE.js'
import SOCKET_SECURITY_SCOPE from '../../registry/dist/lib/constants/SOCKET_SECURITY_SCOPE.js'
import SUPPORTS_NODE_COMPILE_CACHE_API from '../../registry/dist/lib/constants/SUPPORTS_NODE_COMPILE_CACHE_API.js'
import SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR from '../../registry/dist/lib/constants/SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR.js'
import SUPPORTS_NODE_DISABLE_WARNING_FLAG from '../../registry/dist/lib/constants/SUPPORTS_NODE_DISABLE_WARNING_FLAG.js'
import SUPPORTS_NODE_PERMISSION_FLAG from '../../registry/dist/lib/constants/SUPPORTS_NODE_PERMISSION_FLAG.js'
import SUPPORTS_NODE_REQUIRE_MODULE from '../../registry/dist/lib/constants/SUPPORTS_NODE_REQUIRE_MODULE.js'
import SUPPORTS_NODE_RUN from '../../registry/dist/lib/constants/SUPPORTS_NODE_RUN.js'
import SUPPORTS_PROCESS_SEND from '../../registry/dist/lib/constants/SUPPORTS_PROCESS_SEND.js'
import TSCONFIG_JSON from '../../registry/dist/lib/constants/TSCONFIG_JSON.js'
import UNDEFINED_TOKEN from '../../registry/dist/lib/constants/UNDEFINED_TOKEN.js'
import UNKNOWN_ERROR from '../../registry/dist/lib/constants/UNKNOWN_ERROR.js'
import UNKNOWN_VALUE from '../../registry/dist/lib/constants/UNKNOWN_VALUE.js'
import UNLICENCED from '../../registry/dist/lib/constants/UNLICENCED.js'
import UNLICENSED from '../../registry/dist/lib/constants/UNLICENSED.js'
import UTF8 from '../../registry/dist/lib/constants/UTF8.js'
import VITEST from '../../registry/dist/lib/constants/VITEST.js'
import VLT from '../../registry/dist/lib/constants/VLT.js'
import VLT_LOCK_JSON from '../../registry/dist/lib/constants/VLT_LOCK_JSON.js'
import WIN32 from '../../registry/dist/lib/constants/WIN32.js'
import YARN from '../../registry/dist/lib/constants/YARN.js'
import YARN_BERRY from '../../registry/dist/lib/constants/YARN_BERRY.js'
import YARN_LOCK from '../../registry/dist/lib/constants/YARN_LOCK.js'
import bunCachePath from '../../registry/dist/lib/constants/bun-cache-path.js'
import copyLeftLicenses from '../../registry/dist/lib/constants/copy-left-licenses.js'
import execPath from '../../registry/dist/lib/constants/exec-path.js'
import lifecycleScriptNames from '../../registry/dist/lib/constants/lifecycle-script-names.js'
import logger from '../../registry/dist/lib/constants/logger.js'
import nodeDebugFlags from '../../registry/dist/lib/constants/node-debug-flags.js'
import npmExecPath from '../../registry/dist/lib/constants/npm-exec-path.js'
import npmLifecycleEvent from '../../registry/dist/lib/constants/npm-lifecycle-event.js'
import packageManagerCacheNames from '../../registry/dist/lib/constants/package-manager-cache-names.js'
import pacoteCachePath from '../../registry/dist/lib/constants/pacote-cache-path.js'
import pnpmExecPath from '../../registry/dist/lib/constants/pnpm-exec-path.js'
import pnpmStorePath from '../../registry/dist/lib/constants/pnpm-store-path.js'
import tsLibsAvailable from '../../registry/dist/lib/constants/ts-libs-available.js'
import tsTypesAvailable from '../../registry/dist/lib/constants/ts-types-available.js'
import vltCachePath from '../../registry/dist/lib/constants/vlt-cache-path.js'
import yarnCachePath from '../../registry/dist/lib/constants/yarn-cache-path.js'
import yarnClassic from '../../registry/dist/lib/constants/yarn-classic.js'
import yarnExecPath from '../../registry/dist/lib/constants/yarn-exec-path.js'

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
      { name: 'yarnClassic', value: yarnClassic, expected: 'yarn/classic' },
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

  describe('env constants', () => {
    it('should export env variables', () => {
      const env = require('../../registry/dist/lib/constants/ENV')
      expect(env).toBeDefined()
      expect(env.HOME === undefined || typeof env.HOME === 'string').toBe(true)
      expect(env).toHaveProperty('COLUMNS')
    })

    it('should normalize DEBUG=1 to DEBUG=*', () => {
      const originalDebug = process.env['DEBUG']
      process.env['DEBUG'] = '1'
      delete require.cache[
        require.resolve('../../registry/dist/lib/constants/ENV')
      ]
      const env = require('../../registry/dist/lib/constants/ENV')
      expect(env['DEBUG']).toBe('*')
      process.env['DEBUG'] = originalDebug
    })

    it('should normalize DEBUG=true to DEBUG=*', () => {
      const originalDebug = process.env['DEBUG']
      process.env['DEBUG'] = 'true'
      delete require.cache[
        require.resolve('../../registry/dist/lib/constants/ENV')
      ]
      const env = require('../../registry/dist/lib/constants/ENV')
      expect(env['DEBUG']).toBe('*')
      process.env['DEBUG'] = originalDebug
    })

    it('should normalize DEBUG=0 to DEBUG=""', () => {
      const originalDebug = process.env['DEBUG']
      process.env['DEBUG'] = '0'
      delete require.cache[
        require.resolve('../../registry/dist/lib/constants/ENV')
      ]
      const env = require('../../registry/dist/lib/constants/ENV')
      expect(env['DEBUG']).toBe('')
      process.env['DEBUG'] = originalDebug
    })

    it('should normalize DEBUG=false to DEBUG=""', () => {
      const originalDebug = process.env['DEBUG']
      process.env['DEBUG'] = 'false'
      delete require.cache[
        require.resolve('../../registry/dist/lib/constants/ENV')
      ]
      const env = require('../../registry/dist/lib/constants/ENV')
      expect(env['DEBUG']).toBe('')
      process.env['DEBUG'] = originalDebug
    })

    it('should preserve custom DEBUG namespace patterns', () => {
      const originalDebug = process.env['DEBUG']
      process.env['DEBUG'] = 'app:*'
      delete require.cache[
        require.resolve('../../registry/dist/lib/constants/ENV')
      ]
      const env = require('../../registry/dist/lib/constants/ENV')
      expect(env['DEBUG']).toBe('app:*')
      process.env['DEBUG'] = originalDebug
    })
  })

  describe('complex constants', () => {
    it('should export logger with required methods', () => {
      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.warn).toBe('function')
    })

    it('should export lifecycle script names Set', () => {
      expect(lifecycleScriptNames instanceof Set).toBe(true)
      expect(lifecycleScriptNames.size).toBeGreaterThan(0)
      expect(lifecycleScriptNames.has('install')).toBe(true)
    })

    it('should export npm lifecycle event', () => {
      expect(['string', 'undefined']).toContain(typeof npmLifecycleEvent)
    })

    it('should export exec path', () => {
      expect(typeof execPath).toBe('string')
      expect(execPath.length).toBeGreaterThan(0)
    })

    it('should export package manager cache names', () => {
      expect(typeof packageManagerCacheNames).toBe('object')
      expect(Object.isFrozen(packageManagerCacheNames)).toBe(true)
    })

    it('should export node debug flags array', () => {
      expect(Array.isArray(nodeDebugFlags)).toBe(true)
    })

    it('should export TypeScript library availability objects', () => {
      expect(typeof tsLibsAvailable).toBe('object')
      expect(typeof tsTypesAvailable).toBe('object')
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

  describe('abort controller and signal', () => {
    it('should export AbortController instance', () => {
      const abortController = require('../../registry/dist/lib/constants/abort-controller')
      expect(abortController).toBeDefined()
      expect(abortController.signal).toBeDefined()
      expect(typeof abortController.abort).toBe('function')
    })

    it('should have non-aborted signal initially', () => {
      const abortController = require('../../registry/dist/lib/constants/abort-controller')
      expect(abortController.signal.aborted).toBe(false)
    })

    it('should export AbortSignal instance', () => {
      const abortSignal = require('../../registry/dist/lib/constants/abort-signal')
      expect(abortSignal).toBeDefined()
      expect(abortSignal.aborted).toBe(false)
    })
  })

  describe('package manager paths', () => {
    describe('cache paths', () => {
      it('should export bunCachePath', () => {
        expect(typeof bunCachePath).toBe('string')
      })

      it('should export pacoteCachePath', () => {
        expect(typeof pacoteCachePath).toBe('string')
      })

      it('should export pnpmStorePath', () => {
        expect(typeof pnpmStorePath).toBe('string')
      })

      it('should export vltCachePath', () => {
        expect(typeof vltCachePath).toBe('string')
      })

      it('should export yarnCachePath', () => {
        expect(typeof yarnCachePath).toBe('string')
      })
    })

    describe('executable paths', () => {
      it('should export npmExecPath', () => {
        expect(typeof npmExecPath).toBe('string')
        expect(npmExecPath.length).toBeGreaterThan(0)
      })

      it('should export pnpmExecPath', () => {
        expect(typeof pnpmExecPath).toBe('string')
      })

      it('should export yarnExecPath', () => {
        expect(typeof yarnExecPath).toBe('string')
      })
    })
  })
})
