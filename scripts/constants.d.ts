import { FlatConfig } from '@eslint/compat'
import which from 'which'
import registryConstants from '@socketsecurity/registry/lib/constants'

declare const kInternalsSymbol: (typeof registryConstants)['kInternalsSymbol']
type Internals = (typeof registryConstants)[typeof kInternalsSymbol] & {
  readonly which: (cmd: string, options?: which.Options) => Promise<string>
  readonly whichSync: (cmd: string, options?: which.Options) => string
}
declare const constantsModule: typeof registryConstants & {
  readonly [kInternalsSymbol]: Internals
  readonly LICENSE_CONTENT: string
  readonly ecosystems: readonly string[]
  readonly gitExecPath: string
  readonly gitIgnoreFile: FlatConfig
  readonly gitIgnorePath: string
  readonly ignoreGlobs: readonly string[]
  readonly manifestJsonPath: string
  readonly npmPackageNames: readonly string[]
  readonly npmPackagesPath: string
  readonly npmTemplatesPath: string
  readonly npmTemplatesReadmePath: string
  readonly perfNpmPath: string
  readonly perfNpmFixturesPath: string
  readonly prettierConfigPath: string
  readonly prettierConfigPromise: Promise<object | null>
  readonly prettierIgnoreFile: FlatConfig
  readonly prettierIgnorePath: string
  readonly registryPkgPath: string
  readonly relManifestJsonPath: string
  readonly relNpmPackagesPath: string
  readonly relPackagesPath: string
  readonly relTestNpmPath: string
  readonly relTestNpmNodeModulesPath: string
  readonly rootEslintConfigPath: string
  readonly rootLicensePath: string
  readonly rootNodeModulesBinPath: string
  readonly rootNodeModulesPath: string
  readonly rootPackageJsonPath: string
  readonly rootPackageLockPath: string
  readonly rootPackagesPath: string
  readonly rootPath: string
  readonly rootTsConfigPath: string
  readonly tapCiConfigPath: string
  readonly tapConfigPath: string
  readonly tapRunExecPath: string
  readonly templatesPath: string
  readonly testNpmPath: string
  readonly testNpmFixturesPath: string
  readonly testNpmNodeModulesPath: string
  readonly testNpmNodeWorkspacesPath: string
  readonly testNpmPkgJsonPath: string
  readonly testNpmPkgLockPath: string
  readonly tsxExecPath: string
  readonly yarnPkgExtsPath: string
  readonly yarnPkgExtsJsonPath: string
}
export = constantsModule
