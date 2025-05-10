'use strict'

const getIpc = /*@__PURE__*/ require('./get-ipc')
const { createConstantsObject } = /*@__PURE__*/ require('../objects')

/*@__NO_SIDE_EFFECTS__*/
function toKebabCase(str) {
  return (
    str
      // Convert camelCase to kebab-case
      .replace(/([a-z]+[0-9]*)([A-Z])/g, '$1-$2')
      // Convert underscores to hyphens
      .replace(/_/g, '-')
      .toLowerCase()
  )
}

const constantsObj = {
  // Lazily defined values are initialized as `undefined` to keep their key order.
  AT_LATEST: undefined,
  BIOME_JSON: undefined,
  CI: undefined,
  COLUMN_LIMIT: undefined,
  DARWIN: undefined,
  EMPTY_FILE: undefined,
  ENV: undefined,
  ESLINT_CONFIG_JS: undefined,
  ESNEXT: undefined,
  EXT_CMD: undefined,
  EXT_PS1: undefined,
  EXTENSIONS: undefined,
  EXTENSIONS_JSON: undefined,
  GITIGNORE: undefined,
  HIDDEN_PACKAGE_LOCK_JSON: undefined,
  IPC: undefined,
  LATEST: undefined,
  LICENSE: undefined,
  LICENSE_GLOB: undefined,
  LICENSE_GLOB_RECURSIVE: undefined,
  LICENSE_ORIGINAL: undefined,
  LICENSE_ORIGINAL_GLOB: undefined,
  LICENSE_ORIGINAL_GLOB_RECURSIVE: undefined,
  LOOP_SENTINEL: undefined,
  MANIFEST_JSON: undefined,
  MIT: undefined,
  NODE_AUTH_TOKEN: undefined,
  NODE_ENV: undefined,
  NODE_MODULES: undefined,
  NODE_MODULES_GLOB_RECURSIVE: undefined,
  NODE_WORKSPACES: undefined,
  NODE_VERSION: undefined,
  NPM: undefined,
  NPX: undefined,
  OVERRIDES: undefined,
  PACKAGE_DEFAULT_SOCKET_CATEGORIES: undefined,
  PACKAGE_DEFAULT_NODE_RANGE: undefined,
  PACKAGE_DEFAULT_VERSION: undefined,
  PACKAGE_JSON: undefined,
  PACKAGE_LOCK_JSON: undefined,
  PRE_COMMIT: undefined,
  README_GLOB: undefined,
  README_GLOB_RECURSIVE: undefined,
  README_MD: undefined,
  REGISTRY_SCOPE_DELIMITER: undefined,
  REGISTRY: undefined,
  RESOLUTIONS: undefined,
  SOCKET_GITHUB_ORG: undefined,
  SOCKET_IPC_HANDSHAKE: undefined,
  SOCKET_OVERRIDE_SCOPE: undefined,
  SOCKET_PUBLIC_API_KEY: undefined,
  SOCKET_PUBLIC_API_TOKEN: undefined,
  SOCKET_REGISTRY_NPM_ORG: undefined,
  SOCKET_REGISTRY_PACKAGE_NAME: undefined,
  SOCKET_REGISTRY_REPO_NAME: undefined,
  SOCKET_REGISTRY_SCOPE: undefined,
  SOCKET_SECURITY_SCOPE: undefined,
  SUPPORTS_NODE_COMPILE_CACHE_API: undefined,
  SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR: undefined,
  SUPPORTS_NODE_DISABLE_WARNING_FLAG: undefined,
  SUPPORTS_NODE_PERMISSION_FLAG: undefined,
  SUPPORTS_NODE_REQUIRE_MODULE: undefined,
  SUPPORTS_NODE_RUN: undefined,
  SUPPORTS_PROCESS_SEND: undefined,
  TAP: undefined,
  TEMPLATE_CJS: undefined,
  TEMPLATE_CJS_BROWSER: undefined,
  TEMPLATE_CJS_ESM: undefined,
  TEMPLATE_ES_SHIM_CONSTRUCTOR: undefined,
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD: undefined,
  TEMPLATE_ES_SHIM_STATIC_METHOD: undefined,
  TSCONFIG_JSON: undefined,
  UNDEFINED_TOKEN: undefined,
  UNLICENCED: undefined,
  UNLICENSED: undefined,
  UTF8: undefined,
  VITEST: undefined,
  WIN32: undefined,
  abortController: undefined,
  abortSignal: undefined,
  copyLeftLicenses: undefined,
  execPath: undefined,
  ignoreGlobs: undefined,
  lifecycleScriptNames: undefined,
  maintainedNodeVersions: undefined,
  nodeHardenFlags: undefined,
  nodeNoWarningsFlags: undefined,
  npmExecPath: undefined,
  npmRealExecPath: undefined,
  packageExtensions: undefined,
  packumentCache: undefined,
  pacoteCachePath: undefined,
  parseArgsConfig: undefined,
  skipTestsByEcosystem: undefined,
  spinner: undefined,
  tsLibsAvailable: undefined,
  tsTypesAvailable: undefined,
  win32EnsureTestsByEcosystem: undefined
}

module.exports = createConstantsObject(constantsObj, {
  getters: Object.fromEntries(
    Object.keys(constantsObj).map(k => [
      k,
      () => require(`./${toKebabCase(k)}`)
    ])
  ),
  internals: {
    createConstantsObject,
    getIpc
  }
})
