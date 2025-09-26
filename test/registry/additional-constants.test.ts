import { describe, expect, it } from 'vitest'

// Test constants that are not already tested
describe('additional constants', () => {
  describe('string constants', () => {
    it('should export changelog-md constant', () => {
      const changelogMd = require('@socketsecurity/registry/lib/constants/changelog-md')
      expect(typeof changelogMd).toBe('string')
      expect(changelogMd).toBe('CHANGELOG.md')
    })

    it('should export dot-git-dir constant', () => {
      const dotGitDir = require('@socketsecurity/registry/lib/constants/dot-git-dir')
      expect(typeof dotGitDir).toBe('string')
      expect(dotGitDir).toBe('.git')
    })

    it('should export dot-package-lock-json constant', () => {
      const dotPackageLockJson = require('@socketsecurity/registry/lib/constants/dot-package-lock-json')
      expect(typeof dotPackageLockJson).toBe('string')
      expect(dotPackageLockJson).toBe('.package-lock.json')
    })

    it('should export dot-socket-dir constant', () => {
      const dotSocketDir = require('@socketsecurity/registry/lib/constants/dot-socket-dir')
      expect(typeof dotSocketDir).toBe('string')
      expect(dotSocketDir).toBe('.socket')
    })

    it('should export empty-file constant', () => {
      const emptyFile = require('@socketsecurity/registry/lib/constants/empty-file')
      expect(typeof emptyFile).toBe('string')
      expect(emptyFile).toBe('/* empty */\n')
    })

    it('should export empty-value constant', () => {
      const emptyValue = require('@socketsecurity/registry/lib/constants/empty-value')
      expect(emptyValue).toBe('<value>')
    })

    it('should export eslint-config-js constant', () => {
      const eslintConfigJs = require('@socketsecurity/registry/lib/constants/eslint-config-js')
      expect(typeof eslintConfigJs).toBe('string')
      expect(eslintConfigJs).toBe('eslint.config.js')
    })

    it('should export esnext constant', () => {
      const esnext = require('@socketsecurity/registry/lib/constants/esnext')
      expect(typeof esnext).toBe('string')
      expect(esnext).toBe('esnext')
    })
  })

  describe('platform constants', () => {
    it('should export darwin constant', () => {
      const darwin = require('@socketsecurity/registry/lib/constants/darwin')
      expect(typeof darwin).toBe('boolean')
      expect(darwin).toBe(process.platform === 'darwin')
    })

    it('should export bun constant', () => {
      const bun = require('@socketsecurity/registry/lib/constants/bun')
      expect(typeof bun).toBe('string')
      expect(bun).toBe('bun')
    })
  })

  describe('package manager constants', () => {
    it('should export yarn-berry constant', () => {
      const yarnBerry = require('@socketsecurity/registry/lib/constants/yarn-berry')
      expect(typeof yarnBerry).toBe('string')
      expect(yarnBerry).toBe('yarn/berry')
    })

    it('should export yarn-classic constant', () => {
      const yarnClassic = require('@socketsecurity/registry/lib/constants/yarn-classic')
      expect(typeof yarnClassic).toBe('string')
      expect(yarnClassic).toBe('yarn/classic')
    })

    it('should export vlt constant', () => {
      const vlt = require('@socketsecurity/registry/lib/constants/vlt')
      expect(typeof vlt).toBe('string')
      expect(vlt).toBe('vlt')
    })
  })

  describe('file extension constants', () => {
    it('should export ext-js constant', () => {
      const extJs = require('@socketsecurity/registry/lib/constants/ext-js')
      expect(typeof extJs).toBe('string')
      expect(extJs).toBe('.js')
    })

    it('should export ext-mjs constant', () => {
      const extMjs = require('@socketsecurity/registry/lib/constants/ext-mjs')
      expect(typeof extMjs).toBe('string')
      expect(extMjs).toBe('.mjs')
    })

    it('should export ext-json constant', () => {
      const extJson = require('@socketsecurity/registry/lib/constants/ext-json')
      expect(typeof extJson).toBe('string')
      expect(extJson).toBe('.json')
    })

    it('should export ext-md constant', () => {
      const extMd = require('@socketsecurity/registry/lib/constants/ext-md')
      expect(typeof extMd).toBe('string')
      expect(extMd).toBe('.md')
    })

    it('should export ext-yaml constant', () => {
      const extYaml = require('@socketsecurity/registry/lib/constants/ext-yaml')
      expect(typeof extYaml).toBe('string')
      expect(extYaml).toBe('.yaml')
    })

    it('should export ext-yml constant', () => {
      const extYml = require('@socketsecurity/registry/lib/constants/ext-yml')
      expect(typeof extYml).toBe('string')
      expect(extYml).toBe('.yml')
    })
  })

  describe('license constants', () => {
    it('should export license constant', () => {
      const license = require('@socketsecurity/registry/lib/constants/license')
      expect(typeof license).toBe('string')
      expect(license).toBe('LICENSE')
    })

    it('should export unlicenced constant', () => {
      const unlicenced = require('@socketsecurity/registry/lib/constants/unlicenced')
      expect(typeof unlicenced).toBe('string')
      expect(unlicenced).toBe('UNLICENCED')
    })

    it('should export unlicensed constant', () => {
      const unlicensed = require('@socketsecurity/registry/lib/constants/unlicensed')
      expect(typeof unlicensed).toBe('string')
      expect(unlicensed).toBe('UNLICENSED')
    })
  })

  describe('utility constants', () => {
    it('should export latest constant', () => {
      const latest = require('@socketsecurity/registry/lib/constants/latest')
      expect(typeof latest).toBe('string')
      expect(latest).toBe('latest')
    })

    it('should export gitignore constant', () => {
      const gitignore = require('@socketsecurity/registry/lib/constants/gitignore')
      expect(typeof gitignore).toBe('string')
      expect(gitignore).toBe('.gitignore')
    })

    it('should export tsconfig-json constant', () => {
      const tsconfigJson = require('@socketsecurity/registry/lib/constants/tsconfig-json')
      expect(typeof tsconfigJson).toBe('string')
      expect(tsconfigJson).toBe('tsconfig.json')
    })

    it('should export vitest constant', () => {
      const vitest = require('@socketsecurity/registry/lib/constants/vitest')
      expect(typeof vitest).toBe('string')
      expect(vitest).toBe('VITEST')
    })

    it('should export utf8 constant', () => {
      const utf8 = require('@socketsecurity/registry/lib/constants/utf8')
      expect(typeof utf8).toBe('string')
      expect(utf8).toBe('utf8')
    })

    it('should export unknown-error constant', () => {
      const unknownError = require('@socketsecurity/registry/lib/constants/unknown-error')
      expect(typeof unknownError).toBe('string')
      expect(unknownError).toBe('Unknown error')
    })

    it('should export unknown-value constant', () => {
      const unknownValue = require('@socketsecurity/registry/lib/constants/unknown-value')
      expect(typeof unknownValue).toBe('string')
      expect(unknownValue).toBe('<unknown>')
    })
  })
})
