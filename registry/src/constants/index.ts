/**
 * Main constants module that maintains backward compatibility.
 * Re-exports from modular constant files and provides the legacy interface.
 */

import { createConstantsObject } from '../lib/objects'

// Import all static constants.
import * as staticConstants from './static'

// Import lazy getters.
import * as lazyGetters from './lazy'

// Import ENV.
import ENV from './env'

// IPC getter.
let _ipcObject: any
async function getIpc(key?: string) {
  if (_ipcObject === undefined) {
    try {
      const { getIpc: getIpcImpl } = await import('./get-ipc')
      _ipcObject = await getIpcImpl()
    } catch {
      _ipcObject = {}
    }
  }
  return key ? _ipcObject[key] : _ipcObject
}

// Build props object with static values and undefined placeholders for lazy values.
const props: Record<string, any> = {
  // All static constants.
  ...staticConstants,

  // Lazy values initialized as undefined.
  abortController: undefined,
  abortSignal: undefined,
  bunCachePath: undefined,
  copyLeftLicenses: undefined,
  DARWIN: undefined,
  ENV: undefined,
  execPath: undefined,
  ipcObject: undefined,
  lifecycleScriptNames: undefined,
  maintainedNodeVersions: undefined,
  NODE_VERSION: undefined,
  nodeDebugFlags: undefined,
  nodeHardenFlags: undefined,
  nodeNoWarningsFlags: undefined,
  npmExecPath: undefined,
  npmLifecycleEvent: undefined,
  npmRealExecPath: undefined,
  PACKAGE_DEFAULT_NODE_RANGE: undefined,
  PACKAGE_DEFAULT_SOCKET_CATEGORIES: undefined,
  packageExtensions: undefined,
  packageManagerCacheNames: undefined,
  packumentCache: undefined,
  pacoteCachePath: undefined,
  pnpmExecPath: undefined,
  pnpmStorePath: undefined,
  spinner: undefined,
  SUPPORTS_NODE_COMPILE_CACHE_API: undefined,
  SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR: undefined,
  SUPPORTS_NODE_DISABLE_WARNING_FLAG: undefined,
  SUPPORTS_NODE_PERMISSION_FLAG: undefined,
  SUPPORTS_NODE_REQUIRE_MODULE: undefined,
  SUPPORTS_NODE_RUN: undefined,
  SUPPORTS_PROCESS_SEND: undefined,
  tsLibsAvailable: undefined,
  tsTypesAvailable: undefined,
  vltCachePath: undefined,
  WIN32: undefined,
  yarnCachePath: undefined,
  yarnExecPath: undefined,
}

// Create getters for lazy values.
const getters: Record<string, () => any> = {
  abortController: lazyGetters.getAbortController,
  abortSignal: lazyGetters.getAbortSignal,
  bunCachePath: lazyGetters.getBunCachePath,
  copyLeftLicenses: lazyGetters.getCopyLeftLicenses,
  DARWIN: () => lazyGetters.DARWIN,
  ENV: () => ENV,
  execPath: lazyGetters.getExecPath,
  ipcObject: () => getIpc(),
  lifecycleScriptNames: lazyGetters.getLifecycleScriptNames,
  maintainedNodeVersions: lazyGetters.getMaintainedNodeVersions,
  NODE_VERSION: lazyGetters.getNodeVersion,
  nodeDebugFlags: lazyGetters.getNodeDebugFlags,
  nodeHardenFlags: lazyGetters.getNodeHardenFlags,
  nodeNoWarningsFlags: lazyGetters.getNodeNoWarningsFlags,
  npmExecPath: lazyGetters.getNpmExecPath,
  npmLifecycleEvent: lazyGetters.getNpmLifecycleEvent,
  npmRealExecPath: lazyGetters.getNpmRealExecPath,
  PACKAGE_DEFAULT_NODE_RANGE: lazyGetters.getPackageDefaultNodeRange,
  PACKAGE_DEFAULT_SOCKET_CATEGORIES: lazyGetters.getPackageDefaultSocketCategories,
  packageExtensions: lazyGetters.getPackageExtensions,
  packageManagerCacheNames: lazyGetters.getPackageManagerCacheNames,
  packumentCache: lazyGetters.getPackumentCache,
  pacoteCachePath: lazyGetters.getPacoteCachePath,
  pnpmExecPath: lazyGetters.getPnpmExecPath,
  pnpmStorePath: lazyGetters.getPnpmStorePath,
  spinner: lazyGetters.getSpinner,
  SUPPORTS_NODE_COMPILE_CACHE_API: lazyGetters.supportsNodeCompileCacheApi,
  SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR: lazyGetters.supportsNodeCompileCacheEnvVar,
  SUPPORTS_NODE_DISABLE_WARNING_FLAG: lazyGetters.supportsNodeDisableWarningFlag,
  SUPPORTS_NODE_PERMISSION_FLAG: lazyGetters.supportsNodePermissionFlag,
  SUPPORTS_NODE_REQUIRE_MODULE: lazyGetters.supportsNodeRequireModule,
  SUPPORTS_NODE_RUN: lazyGetters.supportsNodeRun,
  SUPPORTS_PROCESS_SEND: lazyGetters.supportsProcessSend,
  tsLibsAvailable: lazyGetters.getTsLibsAvailable,
  tsTypesAvailable: lazyGetters.getTsTypesAvailable,
  vltCachePath: lazyGetters.getVltCachePath,
  WIN32: () => lazyGetters.WIN32,
  yarnCachePath: lazyGetters.getYarnCachePath,
  yarnExecPath: lazyGetters.getYarnExecPath,
}

// Create the constants object with lazy getters.
const constants = createConstantsObject(props, {
  getters: Object.fromEntries(
    Object.keys(props)
      .filter(k => props[k] === undefined)
      .map(k => [k, getters[k] || (() => undefined)])
  ),
  internals: {
    createConstantsObject,
    getIpc,
  },
})

// Export everything.
export * from './static'
export * from './lazy'
export * from './env'
export { ENV }
export default constants