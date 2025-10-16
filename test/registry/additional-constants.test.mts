/**
 * @fileoverview Tests for constants that are not already tested elsewhere.
 */

import { describe, expect, it } from 'vitest'

import * as agents from '../../registry/dist/constants/agents.js'
import * as core from '../../registry/dist/constants/core.js'
import * as encoding from '../../registry/dist/constants/encoding.js'
import * as licenses from '../../registry/dist/constants/licenses.js'
import * as node from '../../registry/dist/constants/node.js'
import * as packages from '../../registry/dist/constants/packages.js'
import * as paths from '../../registry/dist/constants/paths.js'
import * as platform from '../../registry/dist/constants/platform.js'
import * as testing from '../../registry/dist/constants/testing.js'

describe('additional constants', () => {
  describe('paths constants', () => {
    it('should export CHANGELOG_MD constant', () => {
      expect(typeof paths.CHANGELOG_MD).toBe('string')
      expect(paths.CHANGELOG_MD).toBe('CHANGELOG.md')
    })

    it('should export DOT_GIT_DIR constant', () => {
      expect(typeof paths.DOT_GIT_DIR).toBe('string')
      expect(paths.DOT_GIT_DIR).toBe('.git')
    })

    it('should export DOT_PACKAGE_LOCK_JSON constant', () => {
      expect(typeof paths.DOT_PACKAGE_LOCK_JSON).toBe('string')
      expect(paths.DOT_PACKAGE_LOCK_JSON).toBe('.package-lock.json')
    })

    it('should export DOT_SOCKET_DIR constant', () => {
      expect(typeof paths.DOT_SOCKET_DIR).toBe('string')
      expect(paths.DOT_SOCKET_DIR).toBe('.socket')
    })

    it('should export ESLINT_CONFIG_JS constant', () => {
      expect(typeof paths.ESLINT_CONFIG_JS).toBe('string')
      expect(paths.ESLINT_CONFIG_JS).toBe('eslint.config.js')
    })

    it('should export GITIGNORE constant', () => {
      expect(typeof paths.GITIGNORE).toBe('string')
      expect(paths.GITIGNORE).toBe('.gitignore')
    })

    it('should export TSCONFIG_JSON constant', () => {
      expect(typeof paths.TSCONFIG_JSON).toBe('string')
      expect(paths.TSCONFIG_JSON).toBe('tsconfig.json')
    })

    it('should export EXT_JS constant', () => {
      expect(typeof paths.EXT_JS).toBe('string')
      expect(paths.EXT_JS).toBe('.js')
    })

    it('should export EXT_MJS constant', () => {
      expect(typeof paths.EXT_MJS).toBe('string')
      expect(paths.EXT_MJS).toBe('.mjs')
    })

    it('should export EXT_JSON constant', () => {
      expect(typeof paths.EXT_JSON).toBe('string')
      expect(paths.EXT_JSON).toBe('.json')
    })

    it('should export EXT_MD constant', () => {
      expect(typeof paths.EXT_MD).toBe('string')
      expect(paths.EXT_MD).toBe('.md')
    })

    it('should export EXT_YAML constant', () => {
      expect(typeof paths.EXT_YAML).toBe('string')
      expect(paths.EXT_YAML).toBe('.yaml')
    })

    it('should export EXT_YML constant', () => {
      expect(typeof paths.EXT_YML).toBe('string')
      expect(paths.EXT_YML).toBe('.yml')
    })
  })

  describe('core constants', () => {
    it('should export EMPTY_FILE constant', () => {
      expect(typeof core.EMPTY_FILE).toBe('string')
      expect(core.EMPTY_FILE).toBe('/* empty */\n')
    })

    it('should export EMPTY_VALUE constant', () => {
      expect(core.EMPTY_VALUE).toBe('<value>')
    })

    it('should export UNKNOWN_ERROR constant', () => {
      expect(typeof core.UNKNOWN_ERROR).toBe('string')
      expect(core.UNKNOWN_ERROR).toBe('Unknown error')
    })

    it('should export UNKNOWN_VALUE constant', () => {
      expect(typeof core.UNKNOWN_VALUE).toBe('string')
      expect(core.UNKNOWN_VALUE).toBe('<unknown>')
    })
  })

  describe('packages constants', () => {
    it('should export LATEST constant', () => {
      expect(typeof packages.LATEST).toBe('string')
      expect(packages.LATEST).toBe('latest')
    })
  })

  describe('testing constants', () => {
    it('should export VITEST constant', () => {
      expect(typeof testing.VITEST).toBe('string')
      expect(testing.VITEST).toBe('VITEST')
    })
  })

  describe('node constants', () => {
    it('should export ESNEXT constant', () => {
      expect(typeof node.ESNEXT).toBe('string')
      expect(node.ESNEXT).toBe('esnext')
    })
  })

  describe('platform constants', () => {
    it('should export DARWIN constant', () => {
      expect(typeof platform.DARWIN).toBe('boolean')
      expect(platform.DARWIN).toBe(process.platform === 'darwin')
    })
  })

  describe('agents constants', () => {
    it('should export BUN constant', () => {
      expect(typeof agents.BUN).toBe('string')
      expect(agents.BUN).toBe('bun')
    })

    it('should export YARN_BERRY constant', () => {
      expect(typeof agents.YARN_BERRY).toBe('string')
      expect(agents.YARN_BERRY).toBe('yarn/berry')
    })

    it('should export YARN_CLASSIC constant', () => {
      expect(typeof agents.YARN_CLASSIC).toBe('string')
      expect(agents.YARN_CLASSIC).toBe('yarn/classic')
    })

    it('should export VLT constant', () => {
      expect(typeof agents.VLT).toBe('string')
      expect(agents.VLT).toBe('vlt')
    })
  })

  describe('paths license constants', () => {
    it('should export LICENSE constant', () => {
      expect(typeof paths.LICENSE).toBe('string')
      expect(paths.LICENSE).toBe('LICENSE')
    })
  })

  describe('licenses constants', () => {
    it('should export UNLICENCED constant', () => {
      expect(typeof licenses.UNLICENCED).toBe('string')
      expect(licenses.UNLICENCED).toBe('UNLICENCED')
    })

    it('should export UNLICENSED constant', () => {
      expect(typeof licenses.UNLICENSED).toBe('string')
      expect(licenses.UNLICENSED).toBe('UNLICENSED')
    })
  })

  describe('encoding constants', () => {
    it('should export UTF8 constant', () => {
      expect(typeof encoding.UTF8).toBe('string')
      expect(encoding.UTF8).toBe('utf8')
    })
  })
})
