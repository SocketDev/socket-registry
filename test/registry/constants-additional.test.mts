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
import SOCKET_APP_PREFIX from '../../registry/dist/lib/constants/SOCKET_APP_PREFIX.js'
import SOCKET_GITHUB_ORG from '../../registry/dist/lib/constants/SOCKET_GITHUB_ORG.js'
import SOCKET_IPC_HANDSHAKE from '../../registry/dist/lib/constants/SOCKET_IPC_HANDSHAKE.js'
import SOCKET_OVERRIDE_SCOPE from '../../registry/dist/lib/constants/SOCKET_OVERRIDE_SCOPE.js'
import SOCKET_PUBLIC_API_TOKEN from '../../registry/dist/lib/constants/SOCKET_PUBLIC_API_TOKEN.js'
import SOCKET_REGISTRY_NPM_ORG from '../../registry/dist/lib/constants/SOCKET_REGISTRY_NPM_ORG.js'
import SOCKET_REGISTRY_PACKAGE_NAME from '../../registry/dist/lib/constants/SOCKET_REGISTRY_PACKAGE_NAME.js'
import SOCKET_REGISTRY_SCOPE from '../../registry/dist/lib/constants/SOCKET_REGISTRY_SCOPE.js'
import SOCKET_SECURITY_SCOPE from '../../registry/dist/lib/constants/SOCKET_SECURITY_SCOPE.js'
import SUPPORTS_NODE_COMPILE_CACHE_API from '../../registry/dist/lib/constants/SUPPORTS_NODE_COMPILE_CACHE_API.js'
import SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR from '../../registry/dist/lib/constants/SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR.js'
import SUPPORTS_NODE_DISABLE_WARNING_FLAG from '../../registry/dist/lib/constants/SUPPORTS_NODE_DISABLE_WARNING_FLAG.js'
import SUPPORTS_NODE_PERMISSION_FLAG from '../../registry/dist/lib/constants/SUPPORTS_NODE_PERMISSION_FLAG.js'
import SUPPORTS_NODE_REQUIRE_MODULE from '../../registry/dist/lib/constants/SUPPORTS_NODE_REQUIRE_MODULE.js'
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
import YARN from '../../registry/dist/lib/constants/YARN.js'
import YARN_BERRY from '../../registry/dist/lib/constants/YARN_BERRY.js'
import SOCKET_CLI_APP_NAME from '../../registry/dist/lib/constants/SOCKET_CLI_APP_NAME.js'
import SOCKET_DLX_APP_NAME from '../../registry/dist/lib/constants/SOCKET_DLX_APP_NAME.js'
import SOCKET_FIREWALL_APP_NAME from '../../registry/dist/lib/constants/SOCKET_FIREWALL_APP_NAME.js'
import SOCKET_REGISTRY_APP_NAME from '../../registry/dist/lib/constants/SOCKET_REGISTRY_APP_NAME.js'
import SOCKET_REGISTRY_REPO_NAME from '../../registry/dist/lib/constants/SOCKET_REGISTRY_REPO_NAME.js'
import SUPPORTS_NODE_RUN from '../../registry/dist/lib/constants/SUPPORTS_NODE_RUN.js'
import WIN32 from '../../registry/dist/lib/constants/WIN32.js'
import YARN_LOCK from '../../registry/dist/lib/constants/YARN_LOCK.js'

describe('additional constant modules', () => {
  describe('version constants', () => {
    it('should export AT_LATEST', () => {
      expect(typeof AT_LATEST).toBe('string')
      expect(AT_LATEST).toBe('@latest')
    })

    it('should export LATEST', () => {
      expect(typeof LATEST).toBe('string')
      expect(LATEST).toBe('latest')
    })

    it('should export PACKAGE_DEFAULT_VERSION', () => {
      expect(typeof PACKAGE_DEFAULT_VERSION).toBe('string')
      expect(PACKAGE_DEFAULT_VERSION).toBe('1.0.0')
    })
  })

  describe('package manager constants', () => {
    it('should export BUN', () => {
      expect(typeof BUN).toBe('string')
      expect(BUN).toBe('bun')
    })

    it('should export BUN_LOCK', () => {
      expect(typeof BUN_LOCK).toBe('string')
      expect(BUN_LOCK).toBe('bun.lock')
    })

    it('should export BUN_LOCKB', () => {
      expect(typeof BUN_LOCKB).toBe('string')
      expect(BUN_LOCKB).toBe('bun.lockb')
    })

    it('should export NPM', () => {
      expect(typeof NPM).toBe('string')
      expect(NPM).toBe('npm')
    })

    it('should export NPX', () => {
      expect(typeof NPX).toBe('string')
      expect(NPX).toBe('npx')
    })

    it('should export PNPM', () => {
      expect(typeof PNPM).toBe('string')
      expect(PNPM).toBe('pnpm')
    })

    it('should export YARN', () => {
      expect(typeof YARN).toBe('string')
      expect(YARN).toBe('yarn')
    })

    it('should export YARN_BERRY', () => {
      expect(typeof YARN_BERRY).toBe('string')
      expect(YARN_BERRY).toBe('yarn/berry')
    })

    it('should export VLT', () => {
      expect(typeof VLT).toBe('string')
      expect(VLT).toBe('vlt')
    })
  })

  describe('file name constants', () => {
    it('should export PACKAGE_JSON', () => {
      expect(typeof PACKAGE_JSON).toBe('string')
      expect(PACKAGE_JSON).toBe('package.json')
    })

    it('should export DOT_PACKAGE_LOCK_JSON', () => {
      expect(typeof DOT_PACKAGE_LOCK_JSON).toBe('string')
      expect(DOT_PACKAGE_LOCK_JSON).toBe('.package-lock.json')
    })

    it('should export NPM_SHRINKWRAP_JSON', () => {
      expect(typeof NPM_SHRINKWRAP_JSON).toBe('string')
      expect(NPM_SHRINKWRAP_JSON).toBe('npm-shrinkwrap.json')
    })

    it('should export VLT_LOCK_JSON', () => {
      expect(typeof VLT_LOCK_JSON).toBe('string')
      expect(VLT_LOCK_JSON).toBe('vlt-lock.json')
    })

    it('should export TSCONFIG_JSON', () => {
      expect(typeof TSCONFIG_JSON).toBe('string')
      expect(TSCONFIG_JSON).toBe('tsconfig.json')
    })

    it('should export ESLINT_CONFIG_JS', () => {
      expect(typeof ESLINT_CONFIG_JS).toBe('string')
      expect(ESLINT_CONFIG_JS).toBe('eslint.config.js')
    })

    it('should export GITIGNORE', () => {
      expect(typeof GITIGNORE).toBe('string')
      expect(GITIGNORE).toBe('.gitignore')
    })

    it('should export CHANGELOG_MD', () => {
      expect(typeof CHANGELOG_MD).toBe('string')
      expect(CHANGELOG_MD).toBe('CHANGELOG.md')
    })

    it('should export README_MD', () => {
      expect(typeof README_MD).toBe('string')
      expect(README_MD).toBe('README.md')
    })

    it('should export MANIFEST_JSON', () => {
      expect(typeof MANIFEST_JSON).toBe('string')
      expect(MANIFEST_JSON).toBe('manifest.json')
    })

    it('should export VITEST', () => {
      expect(typeof VITEST).toBe('string')
      expect(VITEST).toBe('VITEST')
    })
  })

  describe('directory constants', () => {
    it('should export NODE_MODULES', () => {
      expect(typeof NODE_MODULES).toBe('string')
      expect(NODE_MODULES).toBe('node_modules')
    })

    it('should export DOT_GIT_DIR', () => {
      expect(typeof DOT_GIT_DIR).toBe('string')
      expect(DOT_GIT_DIR).toBe('.git')
    })

    it('should export DOT_SOCKET_DIR', () => {
      expect(typeof DOT_SOCKET_DIR).toBe('string')
      expect(DOT_SOCKET_DIR).toBe('.socket')
    })
  })

  describe('file extension constants', () => {
    it('should export EXT_JS', () => {
      expect(typeof EXT_JS).toBe('string')
      expect(EXT_JS).toBe('.js')
    })

    it('should export EXT_MJS', () => {
      expect(typeof EXT_MJS).toBe('string')
      expect(EXT_MJS).toBe('.mjs')
    })

    it('should export EXT_CJS', () => {
      expect(typeof EXT_CJS).toBe('string')
      expect(EXT_CJS).toBe('.cjs')
    })

    it('should export EXT_DTS', () => {
      expect(typeof EXT_DTS).toBe('string')
      expect(EXT_DTS).toBe('.d.ts')
    })

    it('should export EXT_MTS', () => {
      expect(typeof EXT_MTS).toBe('string')
      expect(EXT_MTS).toBe('.mts')
    })

    it('should export EXT_CTS', () => {
      expect(typeof EXT_CTS).toBe('string')
      expect(EXT_CTS).toBe('.cts')
    })

    it('should export EXT_JSON', () => {
      expect(typeof EXT_JSON).toBe('string')
      expect(EXT_JSON).toBe('.json')
    })

    it('should export EXT_MD', () => {
      expect(typeof EXT_MD).toBe('string')
      expect(EXT_MD).toBe('.md')
    })

    it('should export EXT_YAML', () => {
      expect(typeof EXT_YAML).toBe('string')
      expect(EXT_YAML).toBe('.yaml')
    })

    it('should export EXT_YML', () => {
      expect(typeof EXT_YML).toBe('string')
      expect(EXT_YML).toBe('.yml')
    })

    it('should export EXT_LOCK', () => {
      expect(typeof EXT_LOCK).toBe('string')
      expect(EXT_LOCK).toBe('.lock')
    })

    it('should export EXT_LOCKB', () => {
      expect(typeof EXT_LOCKB).toBe('string')
      expect(EXT_LOCKB).toBe('.lockb')
    })

    it('should export EXT_CMD', () => {
      expect(typeof EXT_CMD).toBe('string')
      expect(EXT_CMD).toBe('.cmd')
    })

    it('should export EXT_PS1', () => {
      expect(typeof EXT_PS1).toBe('string')
      expect(EXT_PS1).toBe('.ps1')
    })

    it('should export EXTENSIONS', () => {
      expect(typeof EXTENSIONS).toBe('string')
      expect(EXTENSIONS).toBe('extensions')
    })

    it('should export EXTENSIONS_JSON', () => {
      expect(typeof EXTENSIONS_JSON).toBe('string')
      expect(EXTENSIONS_JSON).toBe('extensions.json')
    })
  })

  describe('glob pattern constants', () => {
    it('should export LICENSE_GLOB', () => {
      expect(typeof LICENSE_GLOB).toBe('string')
      expect(LICENSE_GLOB).toContain('LICEN')
    })

    it('should export LICENSE_GLOB_RECURSIVE', () => {
      expect(typeof LICENSE_GLOB_RECURSIVE).toBe('string')
      expect(LICENSE_GLOB_RECURSIVE).toContain('LICEN')
    })

    it('should export LICENSE_ORIGINAL_GLOB', () => {
      expect(typeof LICENSE_ORIGINAL_GLOB).toBe('string')
      expect(LICENSE_ORIGINAL_GLOB).toBeTruthy()
    })

    it('should export LICENSE_ORIGINAL_GLOB_RECURSIVE', () => {
      expect(typeof LICENSE_ORIGINAL_GLOB_RECURSIVE).toBe('string')
      expect(LICENSE_ORIGINAL_GLOB_RECURSIVE).toBeTruthy()
    })

    it('should export README_GLOB', () => {
      expect(typeof README_GLOB).toBe('string')
      expect(README_GLOB).toContain('README')
    })

    it('should export README_GLOB_RECURSIVE', () => {
      expect(typeof README_GLOB_RECURSIVE).toBe('string')
      expect(README_GLOB_RECURSIVE).toContain('README')
    })

    it('should export NODE_MODULES_GLOB_RECURSIVE', () => {
      expect(typeof NODE_MODULES_GLOB_RECURSIVE).toBe('string')
      expect(NODE_MODULES_GLOB_RECURSIVE).toContain('node_modules')
    })
  })

  describe('environment constants', () => {
    it('should export CI', () => {
      expect(['boolean', 'string']).toContain(typeof CI)
    })

    it('should export NODE_ENV', () => {
      expect(typeof NODE_ENV).toBe('string')
    })

    it('should export DARWIN', () => {
      expect(typeof DARWIN).toBe('boolean')
    })

    it('should export NODE_SEA_FUSE', () => {
      expect(typeof NODE_SEA_FUSE).toBe('string')
    })

    it('should export SUPPORTS_PROCESS_SEND', () => {
      expect(typeof SUPPORTS_PROCESS_SEND).toBe('boolean')
    })
  })

  describe('Socket constants', () => {
    it('should export SOCKET_GITHUB_ORG', () => {
      expect(typeof SOCKET_GITHUB_ORG).toBe('string')
      expect(SOCKET_GITHUB_ORG).toBe('SocketDev')
    })

    it('should export SOCKET_IPC_HANDSHAKE', () => {
      expect(typeof SOCKET_IPC_HANDSHAKE).toBe('string')
    })

    it('should export SOCKET_OVERRIDE_SCOPE', () => {
      expect(typeof SOCKET_OVERRIDE_SCOPE).toBe('string')
    })

    it('should export SOCKET_PUBLIC_API_TOKEN', () => {
      expect(typeof SOCKET_PUBLIC_API_TOKEN).toBe('string')
    })

    it('should export SOCKET_REGISTRY_NPM_ORG', () => {
      expect(typeof SOCKET_REGISTRY_NPM_ORG).toBe('string')
    })

    it('should export SOCKET_REGISTRY_PACKAGE_NAME', () => {
      expect(typeof SOCKET_REGISTRY_PACKAGE_NAME).toBe('string')
    })

    it('should export SOCKET_REGISTRY_SCOPE', () => {
      expect(typeof SOCKET_REGISTRY_SCOPE).toBe('string')
      expect(SOCKET_REGISTRY_SCOPE).toBe('@socketregistry')
    })

    it('should export SOCKET_SECURITY_SCOPE', () => {
      expect(typeof SOCKET_SECURITY_SCOPE).toBe('string')
      expect(SOCKET_SECURITY_SCOPE).toBe('@socketsecurity')
    })
  })

  describe('Node.js feature support constants', () => {
    it('should export SUPPORTS_NODE_COMPILE_CACHE_API', () => {
      expect(typeof SUPPORTS_NODE_COMPILE_CACHE_API).toBe('boolean')
    })

    it('should export SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR', () => {
      expect(typeof SUPPORTS_NODE_COMPILE_CACHE_ENV_VAR).toBe('boolean')
    })

    it('should export SUPPORTS_NODE_DISABLE_WARNING_FLAG', () => {
      expect(typeof SUPPORTS_NODE_DISABLE_WARNING_FLAG).toBe('boolean')
    })

    it('should export SUPPORTS_NODE_PERMISSION_FLAG', () => {
      expect(typeof SUPPORTS_NODE_PERMISSION_FLAG).toBe('boolean')
    })

    it('should export SUPPORTS_NODE_REQUIRE_MODULE', () => {
      expect(typeof SUPPORTS_NODE_REQUIRE_MODULE).toBe('boolean')
    })
  })

  describe('license constants', () => {
    it('should export LICENSE', () => {
      expect(typeof LICENSE).toBe('string')
      expect(LICENSE).toBe('LICENSE')
    })

    it('should export LICENSE_ORIGINAL', () => {
      expect(typeof LICENSE_ORIGINAL).toBe('string')
      expect(LICENSE_ORIGINAL).toBe('LICENSE.original')
    })

    it('should export MIT', () => {
      expect(typeof MIT).toBe('string')
      expect(MIT).toBe('MIT')
    })

    it('should export UNLICENSED', () => {
      expect(typeof UNLICENSED).toBe('string')
      expect(UNLICENSED).toBe('UNLICENSED')
    })

    it('should export UNLICENCED', () => {
      expect(typeof UNLICENCED).toBe('string')
      expect(UNLICENCED).toBe('UNLICENCED')
    })
  })

  describe('encoding constants', () => {
    it('should export UTF8', () => {
      expect(typeof UTF8).toBe('string')
      expect(UTF8).toBe('utf8')
    })
  })

  describe('special value constants', () => {
    it('should export EMPTY_VALUE', () => {
      expect(typeof EMPTY_VALUE).toBe('string')
      expect(EMPTY_VALUE).toBeTruthy()
    })

    it('should export EMPTY_FILE', () => {
      expect(typeof EMPTY_FILE).toBe('string')
      expect(EMPTY_FILE).toBeTruthy()
    })

    it('should export UNKNOWN_VALUE', () => {
      expect(typeof UNKNOWN_VALUE).toBe('string')
      expect(UNKNOWN_VALUE).toBeTruthy()
    })

    it('should export UNKNOWN_ERROR', () => {
      expect(typeof UNKNOWN_ERROR).toBe('string')
      expect(UNKNOWN_ERROR).toBe('Unknown error')
    })

    it('should export UNDEFINED_TOKEN', () => {
      expect(UNDEFINED_TOKEN).toBeDefined()
    })
  })

  describe('package.json field constants', () => {
    it('should export OVERRIDES', () => {
      expect(typeof OVERRIDES).toBe('string')
      expect(OVERRIDES).toBe('overrides')
    })

    it('should export RESOLUTIONS', () => {
      expect(typeof RESOLUTIONS).toBe('string')
      expect(RESOLUTIONS).toBe('resolutions')
    })
  })

  describe('miscellaneous constants', () => {
    it('should export COLUMN_LIMIT', () => {
      expect(typeof COLUMN_LIMIT).toBe('number')
      expect(COLUMN_LIMIT).toBeGreaterThan(0)
    })

    it('should export ESNEXT', () => {
      expect(typeof ESNEXT).toBe('string')
      expect(ESNEXT).toBe('esnext')
    })

    it('should export NODE_AUTH_TOKEN', () => {
      expect(typeof NODE_AUTH_TOKEN).toBe('string')
    })

    it('should export PRE_COMMIT', () => {
      expect(typeof PRE_COMMIT).toBe('string')
      expect(PRE_COMMIT).toBe('PRE_COMMIT')
    })

    it('should export REGISTRY', () => {
      expect(typeof REGISTRY).toBe('string')
      expect(REGISTRY).toBe('registry')
    })
  })

  describe('cache directory constants', () => {
    it('should export CACHE_DIR', () => {
      expect(typeof CACHE_DIR).toBe('string')
      expect(CACHE_DIR).toBe('cache')
    })

    it('should export CACHE_GITHUB_DIR', () => {
      expect(typeof CACHE_GITHUB_DIR).toBe('string')
      expect(CACHE_GITHUB_DIR).toBe('github')
    })

    it('should export CACHE_SOCKET_API_DIR', () => {
      expect(typeof CACHE_SOCKET_API_DIR).toBe('string')
      expect(CACHE_SOCKET_API_DIR).toBe('socket-api')
    })

    it('should export CACHE_TTL_DIR', () => {
      expect(typeof CACHE_TTL_DIR).toBe('string')
      expect(CACHE_TTL_DIR).toBe('ttl')
    })

    it('should export DLX_BINARY_CACHE_TTL', () => {
      expect(typeof DLX_BINARY_CACHE_TTL).toBe('number')
      expect(DLX_BINARY_CACHE_TTL).toBeGreaterThan(0)
    })
  })

  describe('additional directory constants', () => {
    it('should export DOT_GITHUB', () => {
      expect(typeof DOT_GITHUB).toBe('string')
      expect(DOT_GITHUB).toBe('.github')
    })
  })

  describe('Socket app name constants', () => {
    it('should export SOCKET_APP_PREFIX', () => {
      expect(typeof SOCKET_APP_PREFIX).toBe('string')
      expect(SOCKET_APP_PREFIX).toBe('_')
    })

    it('should export SOCKET_CLI_APP_NAME', () => {
      expect(typeof SOCKET_CLI_APP_NAME).toBe('string')
      expect(SOCKET_CLI_APP_NAME).toBe('socket')
    })

    it('should export SOCKET_DLX_APP_NAME', () => {
      expect(typeof SOCKET_DLX_APP_NAME).toBe('string')
      expect(SOCKET_DLX_APP_NAME).toBe('dlx')
    })

    it('should export SOCKET_FIREWALL_APP_NAME', () => {
      expect(typeof SOCKET_FIREWALL_APP_NAME).toBe('string')
      expect(SOCKET_FIREWALL_APP_NAME).toBe('sfw')
    })

    it('should export SOCKET_REGISTRY_APP_NAME', () => {
      expect(typeof SOCKET_REGISTRY_APP_NAME).toBe('string')
      expect(SOCKET_REGISTRY_APP_NAME).toBe('registry')
    })

    it('should export SOCKET_REGISTRY_REPO_NAME', () => {
      expect(typeof SOCKET_REGISTRY_REPO_NAME).toBe('string')
      expect(SOCKET_REGISTRY_REPO_NAME).toBe('socket-registry')
    })
  })

  describe('additional package manager constants', () => {
    it('should export NPM_REGISTRY_URL', () => {
      expect(typeof NPM_REGISTRY_URL).toBe('string')
      expect(NPM_REGISTRY_URL).toContain('registry.npmjs.org')
    })

    it('should export PACKAGE_LOCK_JSON', () => {
      expect(typeof PACKAGE_LOCK_JSON).toBe('string')
      expect(PACKAGE_LOCK_JSON).toBe('package-lock.json')
    })

    it('should export PNPM_LOCK_YAML', () => {
      expect(typeof PNPM_LOCK_YAML).toBe('string')
      expect(PNPM_LOCK_YAML).toBe('pnpm-lock.yaml')
    })

    it('should export YARN_LOCK', () => {
      expect(typeof YARN_LOCK).toBe('string')
      expect(YARN_LOCK).toBe('yarn.lock')
    })
  })

  describe('platform detection constants', () => {
    it('should export WIN32', () => {
      expect(typeof WIN32).toBe('boolean')
    })

    it('should export SUPPORTS_NODE_RUN', () => {
      expect(typeof SUPPORTS_NODE_RUN).toBe('boolean')
    })
  })
})
