/**
 * @fileoverview Central exports for all constants modules.
 * Re-exports all individual constant values from their respective files.
 */

import getIpc from './get-ipc'
import { createConstantsObject } from '../objects'
import { toKebabCase } from '../strings'

const props: Record<string, any> = {
  // Lazily defined values are initialized as `undefined` to keep their key order.
  AT_LATEST: '@latest',
  BUN: 'bun',
  BUN_LOCK: 'bun.lock',
  BUN_LOCKB: 'bun.lockb',
  bunCachePath: undefined,
  CACHE_DIR: 'cache',
  CACHE_GITHUB_DIR: 'github',
  CACHE_SOCKET_API_DIR: 'socket-api',
  CACHE_TTL_DIR: 'ttl',
  CHANGELOG_MD: 'CHANGELOG.md',
  CI: 'CI',
  COLUMN_LIMIT: 80,
  DARWIN: undefined,
  DOT_GIT_DIR: '.git',
  DOT_GITHUB: '.github',
  DOT_PACKAGE_LOCK_JSON: '.package-lock.json',
  DOT_SOCKET_DIR: '.socket',
  EMPTY_FILE: '/* empty */\n',
  EMPTY_VALUE: '<value>',
  ENV: undefined,
  ESLINT_CONFIG_JS: 'eslint.config.js',
  ESNEXT: 'esnext',
  EXT_CJS: '.cjs',
  EXT_CMD: '.cmd',
  EXT_CTS: '.cts',
  EXT_DTS: '.d.ts',
  EXT_JS: '.js',
  EXT_JSON: '.json',
  EXT_LOCK: '.lock',
  EXT_LOCKB: '.lockb',
  EXT_MD: '.md',
  EXT_MJS: '.mjs',
  EXT_MTS: '.mts',
  EXT_PS1: '.ps1',
  EXT_YAML: '.yaml',
  EXT_YML: '.yml',
  EXTENSIONS: 'extensions',
  EXTENSIONS_JSON: 'extensions.json',
  GITIGNORE: '.gitignore',
  LATEST: 'latest',
  LICENSE: 'LICENSE',
  LICENSE_GLOB: 'LICEN[CS]E{[.-]*,}',
  LICENSE_GLOB_RECURSIVE: '**/LICEN[CS]E{[.-]*,}',
  LICENSE_ORIGINAL: 'LICENSE.original',
  LICENSE_ORIGINAL_GLOB: '*.original{.*,}',
  LICENSE_ORIGINAL_GLOB_RECURSIVE: '**/*.original{.*,}',
  LOOP_SENTINEL: 1_000_000,
  MANIFEST_JSON: 'manifest.json',
  MIT: 'MIT',
  NODE_AUTH_TOKEN: 'NODE_AUTH_TOKEN',
  NODE_ENV: 'NODE_ENV',
  NODE_MODULES: 'node_modules',
  NODE_MODULES_GLOB_RECURSIVE: '**/node_modules',
  NODE_SEA_FUSE: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  NODE_VERSION: undefined,
  NPM: 'npm',
  npmLifecycleEvent: undefined,
  NPM_SHRINKWRAP_JSON: 'npm-shrinkwrap.json',
  NPX: 'npx',
  OVERRIDES: 'overrides',
  PACKAGE_DEFAULT_SOCKET_CATEGORIES: undefined,
  PACKAGE_DEFAULT_NODE_RANGE: undefined,
  PACKAGE_DEFAULT_VERSION: '1.0.0',
  PACKAGE_JSON: 'package.json',
  PACKAGE_LOCK_JSON: 'package-lock.json',
  PNPM: 'pnpm',
  PNPM_LOCK_YAML: 'pnpm-lock.yaml',
  pnpmStorePath: undefined,
  PRE_COMMIT: 'PRE_COMMIT',
  README_GLOB: 'README{.*,}',
  README_GLOB_RECURSIVE: '**/README{.*,}',
  README_MD: 'README.md',
  REGISTRY_SCOPE_DELIMITER: '__',
  REGISTRY: 'registry',
  RESOLUTIONS: 'resolutions',
  SOCKET_APP_PREFIX: '_',
  SOCKET_CLI_APP_NAME: 'socket',
  SOCKET_DLX_APP_NAME: 'dlx',
  SOCKET_FIREWALL_APP_NAME: 'sfw',
  SOCKET_GITHUB_ORG: 'SocketDev',
  SOCKET_IPC_HANDSHAKE: 'SOCKET_IPC_HANDSHAKE',
  SOCKET_OVERRIDE_SCOPE: '@socketoverride',
  SOCKET_PUBLIC_API_TOKEN:
    'sktsec_t_--RAN5U4ivauy4w37-6aoKyYPDt5ZbaT5JBVMqiwKo_api',
  SOCKET_REGISTRY_NPM_ORG: 'socketregistry',
  SOCKET_REGISTRY_APP_NAME: 'registry',
  SOCKET_REGISTRY_PACKAGE_NAME: '@socketsecurity/registry',
  SOCKET_REGISTRY_REPO_NAME: 'socket-registry',
  SOCKET_REGISTRY_SCOPE: '@socketregistry',
  SOCKET_SECURITY_SCOPE: '@socketsecurity',
  SUPPORTS_NODE_COMPILE_CACHE_API: undefined,
  SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR: undefined,
  SUPPORTS_NODE_DISABLE_WARNING_FLAG: undefined,
  SUPPORTS_NODE_PERMISSION_FLAG: undefined,
  SUPPORTS_NODE_REQUIRE_MODULE: undefined,
  SUPPORTS_NODE_RUN: undefined,
  SUPPORTS_PROCESS_SEND: undefined,
  TSCONFIG_JSON: 'tsconfig.json',
  UNDEFINED_TOKEN: undefined,
  UNKNOWN_ERROR: 'Unknown error',
  UNKNOWN_VALUE: '<unknown>',
  UNLICENCED: 'UNLICENCED',
  UNLICENSED: 'UNLICENSED',
  UTF8: 'utf8',
  VITEST: 'VITEST',
  VLT: 'vlt',
  VLT_LOCK_JSON: 'vlt-lock.json',
  vltCachePath: undefined,
  WIN32: undefined,
  YARN: 'yarn',
  YARN_BERRY: 'yarn/berry',
  yarnCachePath: undefined,
  YARN_CLASSIC: 'yarn/classic',
  YARN_LOCK: 'yarn.lock',
  abortController: undefined,
  abortSignal: undefined,
  copyLeftLicenses: undefined,
  execPath: undefined,
  ipcObject: undefined,
  lifecycleScriptNames: undefined,
  maintainedNodeVersions: undefined,
  nodeDebugFlags: undefined,
  nodeHardenFlags: undefined,
  nodeNoWarningsFlags: undefined,
  npmExecPath: undefined,
  npmRealExecPath: undefined,
  packageExtensions: undefined,
  packageManagerCacheNames: undefined,
  pnpmExecPath: undefined,
  packumentCache: undefined,
  pacoteCachePath: undefined,
  spinner: undefined,
  tsLibsAvailable: undefined,
  tsTypesAvailable: undefined,
  yarnExecPath: undefined,
}

export default createConstantsObject(props, {
  getters: Object.fromEntries(
    Object.keys(props)
      .filter(k => props[k] === undefined)
      .map(k => [
        k,
        () => {
          // Try key as-is first (for already-uppercase keys like SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR).
          try {
            return require(`./${k}`)
          } catch {
            // Try UPPER_SNAKE_CASE (for camelCase keys like execPath → EXEC_PATH).
            const upperSnakeCase = k
              .replace(/[A-Z]/g, (m, i) => (i > 0 ? '_' : '') + m)
              .toUpperCase()
            try {
              return require(`./${upperSnakeCase}`)
            } catch {
              // Fall back to kebab-case.
              return require(`./${toKebabCase(k)}`)
            }
          }
        },
      ]),
  ),
  internals: {
    createConstantsObject,
    getIpc,
  },
})
