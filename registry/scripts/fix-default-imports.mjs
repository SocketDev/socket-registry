/**
 * @fileoverview Fix .default references to constants that were changed to direct module.exports.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  printError,
  printFooter,
  printHeader,
  printSuccess,
} from '../../scripts/utils/cli-helpers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')

async function fixDefaultReferences() {
  printHeader('Fixing Default References')

  const constantNames = [
    'AT_LATEST',
    'BUN',
    'BUN_LOCK',
    'BUN_LOCKB',
    'CACHE_DIR',
    'CACHE_GITHUB_DIR',
    'CACHE_SOCKET_API_DIR',
    'CACHE_TTL_DIR',
    'CHANGELOG_MD',
    'CI',
    'COLUMN_LIMIT',
    'DARWIN',
    'DLX_BINARY_CACHE_TTL',
    'DOT_GITHUB',
    'DOT_GIT_DIR',
    'DOT_PACKAGE_LOCK_JSON',
    'DOT_SOCKET_DIR',
    'EMPTY_FILE',
    'EMPTY_VALUE',
    'ENV',
    'ESLINT_CONFIG_JS',
    'ESNEXT',
    'EXTENSIONS',
    'EXTENSIONS_JSON',
    'EXT_CJS',
    'EXT_CMD',
    'EXT_CTS',
    'EXT_DTS',
    'EXT_JS',
    'EXT_JSON',
    'EXT_LOCK',
    'EXT_LOCKB',
    'EXT_MD',
    'EXT_MJS',
    'EXT_MTS',
    'EXT_PS1',
    'EXT_YAML',
    'EXT_YML',
    'GITHUB_API_BASE_URL',
    'GITIGNORE',
    'LATEST',
    'LICENSE',
    'LICENSE_GLOB',
    'LICENSE_GLOB_RECURSIVE',
    'LICENSE_ORIGINAL',
    'LICENSE_ORIGINAL_GLOB',
    'LICENSE_ORIGINAL_GLOB_RECURSIVE',
    'LOOP_SENTINEL',
    'MANIFEST_JSON',
    'MIT',
    'NODE_AUTH_TOKEN',
    'NODE_ENV',
    'NODE_HARDEN_FLAGS',
    'NODE_MODULES',
    'NODE_MODULES_GLOB_RECURSIVE',
    'NODE_NO_WARNINGS_FLAGS',
    'NODE_SEA_FUSE',
    'NPM',
    'NPM_REAL_EXEC_PATH',
    'NPM_REGISTRY_URL',
    'NPM_SHRINKWRAP_JSON',
    'NPX',
    'OVERRIDES',
    'PACKAGE_DEFAULT_VERSION',
    'PACKAGE_JSON',
    'PACKAGE_LOCK_JSON',
    'PNPM',
    'PNPM_LOCK_YAML',
    'PRE_COMMIT',
    'README_GLOB',
    'README_GLOB_RECURSIVE',
    'README_MD',
    'REGISTRY',
    'REGISTRY_SCOPE_DELIMITER',
    'RESOLUTIONS',
    'SOCKET_API_BASE_URL',
    'SOCKET_APP_PREFIX',
    'SOCKET_CLI_APP_NAME',
    'SOCKET_DLX_APP_NAME',
    'SOCKET_FIREWALL_APP_NAME',
    'SOCKET_GITHUB_ORG',
    'SOCKET_IPC_HANDSHAKE',
    'SOCKET_OVERRIDE_SCOPE',
    'SOCKET_PUBLIC_API_TOKEN',
    'SOCKET_REGISTRY_APP_NAME',
    'SOCKET_REGISTRY_NPM_ORG',
    'SOCKET_REGISTRY_PACKAGE_NAME',
    'SOCKET_REGISTRY_REPO_NAME',
    'SOCKET_REGISTRY_SCOPE',
    'SOCKET_SECURITY_SCOPE',
    'SUPPORTS_NODE_COMPILE_CACHE_API',
    'SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR',
    'SUPPORTS_NODE_DISABLE_WARNING_FLAG',
    'SUPPORTS_NODE_PERMISSION_FLAG',
    'SUPPORTS_NODE_REQUIRE_MODULE',
    'SUPPORTS_NODE_RUN',
    'SUPPORTS_PROCESS_SEND',
    'TSCONFIG_JSON',
    'UNDEFINED_TOKEN',
    'UNKNOWN_ERROR',
    'UNKNOWN_VALUE',
    'UNLICENCED',
    'UNLICENSED',
    'UTF8',
    'VITEST',
    'VLT',
    'VLT_LOCK_JSON',
    'WIN32',
    'YARN',
    'YARN_BERRY',
    'YARN_LOCK',
    // Complex constants
    'abort-controller',
    'abort-signal',
    'bun-cache-path',
    'copy-left-licenses',
    'exec-path',
    'get-ipc',
    'ipc-handler',
    'ipc-object',
    'ipc-promise',
    'ipc-target',
    'k-internals-symbol',
    'lifecycle-script-names',
    'logger',
    'maintained-node-versions',
    'node-debug-flags',
    'node-version',
    'npm-exec-path',
    'npm-lifecycle-event',
    'package-default-node-range',
    'package-default-socket-categories',
    'package-extensions',
    'package-manager-cache-names',
    'packument-cache',
    'pacote-cache-path',
    'pnpm-exec-path',
    'pnpm-store-path',
    'spinner',
    'ts-libs-available',
    'ts-types-available',
    'vlt-cache-path',
    'yarn-cache-path',
    'yarn-classic',
    'yarn-exec-path',
  ]

  // Create a map of import names to fix.
  const importNameMap = {}
  for (const name of constantNames) {
    // Convert kebab-case to underscore format (e.g., 'abort-controller' -> 'abort_controller')
    const varName = name.replace(/-/g, '_')
    importNameMap[`${varName}_1`] = true
    importNameMap[`${name.toUpperCase()}_1`] = true
    importNameMap[`${name.replace(/-/g, '_').toUpperCase()}_1`] = true
  }

  async function processDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        await processDirectory(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        let content = await fs.readFile(fullPath, 'utf8')
        let modified = false

        // Replace patterns like `CONSTANT_NAME_1.default` with `CONSTANT_NAME_1`
        for (const importName in importNameMap) {
          const regex = new RegExp(`\\b${importName}\\.default\\b`, 'g')
          if (regex.test(content)) {
            content = content.replace(regex, importName)
            modified = true
          }
        }

        if (modified) {
          await fs.writeFile(fullPath, content)
          console.log(`    Fixed ${path.relative(distDir, fullPath)}`)
        }
      }
    }
  }

  try {
    await processDirectory(distDir)
    printSuccess('Default references fixed')
    printFooter()
  } catch (error) {
    printError(`Failed to fix default references: ${error.message}`)
    process.exitCode = 1
  }
}

fixDefaultReferences().catch(error => {
  printError(`Script failed: ${error.message || error}`)
  process.exitCode = 1
})
