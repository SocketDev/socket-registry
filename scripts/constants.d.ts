import registryConstants from '@socketsecurity/registry/lib/constants'
import { Remap } from '@socketsecurity/registry/lib/objects'
import which from 'which'

declare const kInternalsSymbol: (typeof registryConstants)['kInternalsSymbol']
type Internals = Remap<
  (typeof registryConstants)[typeof kInternalsSymbol] & {
    readonly which: (cmd: string, options?: which.Options) => Promise<string>
    readonly whichSync: (cmd: string, options?: which.Options) => string
  }
>
declare const Constants: Remap<
  Exclude<typeof registryConstants, typeof kInternalsSymbol> & {
    readonly [kInternalsSymbol]: Internals
    readonly LICENSE_CONTENT: string
    readonly ecosystems: readonly string[]
    readonly gitExecPath: string
    readonly ignoreGlobs: readonly string[]
    readonly npmPackageNames: readonly string[]
    readonly npmPackagesPath: string
    readonly npmTemplatesPath: string
    readonly npmTemplatesReadmePath: string
    readonly perfNpmPath: string
    readonly perfNpmFixturesPath: string
    readonly registryExtensionsJsonPath: string
    readonly registryManifestJsonPath: string
    readonly registryPkgPath: string
    readonly relNpmPackagesPath: string
    readonly relPackagesPath: string
    readonly relRegistryManifestJsonPath: string
    readonly relRegistryPkgPath: String
    readonly relTestNpmPath: string
    readonly relTestNpmNodesPath: string
    readonly rootEslintConfigPath: string
    readonly rootLicensePath: string
    readonly rootNodesBinPath: string
    readonly rootNodesPath: string
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
    readonly testNpmNodesPath: string
    readonly testNpmNodeWorkspacesPath: string
    readonly testNpmPkgJsonPath: string
    readonly testNpmPkgLockPath: string
    readonly tsxExecPath: string
    readonly yarnPkgExtsPath: string
    readonly yarnPkgExtsJsonPath: string
  }
>
export = Constants
