/**
 * @fileoverview Tests for path-related constants.
 *
 * Validates file names, directory names, extensions, and glob patterns.
 */

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
  LICENSE_MD,
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
  ROLLUP_EXTERNAL_SUFFIX,
  SLASH_NODE_MODULES_SLASH,
  TSCONFIG_JSON,
} from '@socketsecurity/lib/constants/paths'
import { describe, expect, it } from 'vitest'

describe('paths constants', () => {
  describe('file names', () => {
    it('should have common file names', () => {
      expect(PACKAGE_JSON).toBe('package.json')
      expect(TSCONFIG_JSON).toBe('tsconfig.json')
      expect(LICENSE).toBe('LICENSE')
      expect(LICENSE_MD).toBe('LICENSE.md')
      expect(LICENSE_ORIGINAL).toBe('LICENSE.original')
      expect(README_MD).toBe('README.md')
      expect(CHANGELOG_MD).toBe('CHANGELOG.md')
      expect(MANIFEST_JSON).toBe('manifest.json')
      expect(EXTENSIONS_JSON).toBe('extensions.json')
      expect(ESLINT_CONFIG_JS).toBe('eslint.config.js')
      expect(GITIGNORE).toBe('.gitignore')
      expect(DOT_PACKAGE_LOCK_JSON).toBe('.package-lock.json')
    })
  })

  describe('directory names', () => {
    it('should have common directory names', () => {
      expect(NODE_MODULES).toBe('node_modules')
      expect(DOT_GIT_DIR).toBe('.git')
      expect(DOT_GITHUB).toBe('.github')
      expect(DOT_SOCKET_DIR).toBe('.socket')
      expect(CACHE_DIR).toBe('cache')
      expect(CACHE_TTL_DIR).toBe('ttl')
    })
  })

  describe('path patterns', () => {
    it('should have node_modules patterns', () => {
      expect(NODE_MODULES_GLOB_RECURSIVE).toBe('**/node_modules')
      expect(SLASH_NODE_MODULES_SLASH).toBe('/node_modules/')
    })
  })

  describe('file extensions', () => {
    it('should have JavaScript extensions', () => {
      expect(EXT_CJS).toBe('.cjs')
      expect(EXT_JS).toBe('.js')
      expect(EXT_MJS).toBe('.mjs')
    })

    it('should have TypeScript extensions', () => {
      expect(EXT_CTS).toBe('.cts')
      expect(EXT_DTS).toBe('.d.ts')
      expect(EXT_MTS).toBe('.mts')
    })

    it('should have other extensions', () => {
      expect(EXT_CMD).toBe('.cmd')
      expect(EXT_JSON).toBe('.json')
      expect(EXT_LOCK).toBe('.lock')
      expect(EXT_LOCKB).toBe('.lockb')
      expect(EXT_MD).toBe('.md')
      expect(EXT_PS1).toBe('.ps1')
      expect(EXT_YAML).toBe('.yaml')
      expect(EXT_YML).toBe('.yml')
    })
  })

  describe('glob patterns', () => {
    it('should have LICENSE globs', () => {
      expect(LICENSE_GLOB).toBe('LICEN[CS]E{[.-]*,}')
      expect(LICENSE_GLOB_RECURSIVE).toBe('**/LICEN[CS]E{[.-]*,}')
      expect(LICENSE_ORIGINAL_GLOB).toBe('*.original{.*,}')
      expect(LICENSE_ORIGINAL_GLOB_RECURSIVE).toBe('**/*.original{.*,}')
    })

    it('should have README globs', () => {
      expect(README_GLOB).toBe('README{.*,}')
      expect(README_GLOB_RECURSIVE).toBe('**/README{.*,}')
    })
  })

  describe('miscellaneous', () => {
    it('should have extension constants', () => {
      expect(EXTENSIONS).toBe('extensions')
      expect(ROLLUP_EXTERNAL_SUFFIX).toBe('__rollup_external')
    })
  })
})
