import { describe, expect, it } from 'vitest'

// Test constants that are not already tested
describe('additional constants', () => {
  describe('string constants', () => {
    it('should export changelog-md constant', () => {
      const changelogMd = require('../../registry/dist/lib/constants/CHANGELOG_MD')
      expect(typeof changelogMd).toBe('string')
      expect(changelogMd).toBe('CHANGELOG.md')
    })

    it('should export dot-git-dir constant', () => {
      const dotGitDir = require('../../registry/dist/lib/constants/DOT_GIT_DIR')
      expect(typeof dotGitDir).toBe('string')
      expect(dotGitDir).toBe('.git')
    })

    it('should export dot-package-lock-json constant', () => {
      const dotPackageLockJson = require('../../registry/dist/lib/constants/DOT_PACKAGE_LOCK_JSON')
      expect(typeof dotPackageLockJson).toBe('string')
      expect(dotPackageLockJson).toBe('.package-lock.json')
    })

    it('should export dot-socket-dir constant', () => {
      const dotSocketDir = require('../../registry/dist/lib/constants/DOT_SOCKET_DIR')
      expect(typeof dotSocketDir).toBe('string')
      expect(dotSocketDir).toBe('.socket')
    })

    it('should export empty-file constant', () => {
      const emptyFile = require('../../registry/dist/lib/constants/EMPTY_FILE')
      expect(typeof emptyFile).toBe('string')
      expect(emptyFile).toBe('/* empty */\n')
    })

    it('should export empty-value constant', () => {
      const emptyValue = require('../../registry/dist/lib/constants/EMPTY_VALUE')
      expect(emptyValue).toBe('<value>')
    })

    it('should export eslint-config-js constant', () => {
      const eslintConfigJs = require('../../registry/dist/lib/constants/ESLINT_CONFIG_JS')
      expect(typeof eslintConfigJs).toBe('string')
      expect(eslintConfigJs).toBe('eslint.config.js')
    })

    it('should export esnext constant', () => {
      const esnext = require('../../registry/dist/lib/constants/ESNEXT')
      expect(typeof esnext).toBe('string')
      expect(esnext).toBe('esnext')
    })
  })

  describe('platform constants', () => {
    it('should export darwin constant', () => {
      const darwin = require('../../registry/dist/lib/constants/DARWIN')
      expect(typeof darwin).toBe('boolean')
      expect(darwin).toBe(process.platform === 'darwin')
    })

    it('should export bun constant', () => {
      const bun = require('../../registry/dist/lib/constants/BUN')
      expect(typeof bun).toBe('string')
      expect(bun).toBe('bun')
    })
  })

  describe('package manager constants', () => {
    it('should export yarn-berry constant', () => {
      const yarnBerry = require('../../registry/dist/lib/constants/YARN_BERRY')
      expect(typeof yarnBerry).toBe('string')
      expect(yarnBerry).toBe('yarn/berry')
    })

    it('should export yarn-classic constant', () => {
      const yarnClassic = require('../../registry/dist/lib/constants/yarn-classic')
      expect(typeof yarnClassic).toBe('string')
      expect(yarnClassic).toBe('yarn/classic')
    })

    it('should export vlt constant', () => {
      const vlt = require('../../registry/dist/lib/constants/VLT')
      expect(typeof vlt).toBe('string')
      expect(vlt).toBe('vlt')
    })
  })

  describe('file extension constants', () => {
    it('should export ext-js constant', () => {
      const extJs = require('../../registry/dist/lib/constants/EXT_JS')
      expect(typeof extJs).toBe('string')
      expect(extJs).toBe('.js')
    })

    it('should export ext-mjs constant', () => {
      const extMjs = require('../../registry/dist/lib/constants/EXT_MJS')
      expect(typeof extMjs).toBe('string')
      expect(extMjs).toBe('.mjs')
    })

    it('should export ext-json constant', () => {
      const extJson = require('../../registry/dist/lib/constants/EXT_JSON')
      expect(typeof extJson).toBe('string')
      expect(extJson).toBe('.json')
    })

    it('should export ext-md constant', () => {
      const extMd = require('../../registry/dist/lib/constants/EXT_MD')
      expect(typeof extMd).toBe('string')
      expect(extMd).toBe('.md')
    })

    it('should export ext-yaml constant', () => {
      const extYaml = require('../../registry/dist/lib/constants/EXT_YAML')
      expect(typeof extYaml).toBe('string')
      expect(extYaml).toBe('.yaml')
    })

    it('should export ext-yml constant', () => {
      const extYml = require('../../registry/dist/lib/constants/EXT_YML')
      expect(typeof extYml).toBe('string')
      expect(extYml).toBe('.yml')
    })
  })

  describe('license constants', () => {
    it('should export license constant', () => {
      const license = require('../../registry/dist/lib/constants/LICENSE')
      expect(typeof license).toBe('string')
      expect(license).toBe('LICENSE')
    })

    it('should export unlicenced constant', () => {
      const unlicenced = require('../../registry/dist/lib/constants/UNLICENCED')
      expect(typeof unlicenced).toBe('string')
      expect(unlicenced).toBe('UNLICENCED')
    })

    it('should export unlicensed constant', () => {
      const unlicensed = require('../../registry/dist/lib/constants/UNLICENSED')
      expect(typeof unlicensed).toBe('string')
      expect(unlicensed).toBe('UNLICENSED')
    })
  })

  describe('utility constants', () => {
    it('should export latest constant', () => {
      const latest = require('../../registry/dist/lib/constants/LATEST')
      expect(typeof latest).toBe('string')
      expect(latest).toBe('latest')
    })

    it('should export gitignore constant', () => {
      const gitignore = require('../../registry/dist/lib/constants/GITIGNORE')
      expect(typeof gitignore).toBe('string')
      expect(gitignore).toBe('.gitignore')
    })

    it('should export tsconfig-json constant', () => {
      const tsconfigJson = require('../../registry/dist/lib/constants/TSCONFIG_JSON')
      expect(typeof tsconfigJson).toBe('string')
      expect(tsconfigJson).toBe('tsconfig.json')
    })

    it('should export vitest constant', () => {
      const vitest = require('../../registry/dist/lib/constants/VITEST')
      expect(typeof vitest).toBe('string')
      expect(vitest).toBe('VITEST')
    })

    it('should export utf8 constant', () => {
      const utf8 = require('../../registry/dist/lib/constants/UTF8')
      expect(typeof utf8).toBe('string')
      expect(utf8).toBe('utf8')
    })

    it('should export unknown-error constant', () => {
      const unknownError = require('../../registry/dist/lib/constants/UNKNOWN_ERROR')
      expect(typeof unknownError).toBe('string')
      expect(unknownError).toBe('Unknown error')
    })

    it('should export unknown-value constant', () => {
      const unknownValue = require('../../registry/dist/lib/constants/UNKNOWN_VALUE')
      expect(typeof unknownValue).toBe('string')
      expect(unknownValue).toBe('<unknown>')
    })
  })
})
