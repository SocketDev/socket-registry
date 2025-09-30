import which from 'which'

import registryConstants from '@socketsecurity/registry/lib/constants'
import { Remap } from '@socketsecurity/registry/lib/objects'

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
    readonly ENV: Remap<
      (typeof registryConstants)['ENV'] & {
        readonly VERBOSE_BUILD: boolean
      }
    >
    readonly BIOME_JSON: 'biome.json'
    readonly DEFAULT_CONCURRENCY: 3
    readonly LICENSE_CONTENT: string
    readonly PACKAGES: 'packages'
    readonly TEMPLATE_CJS: 'cjs'
    readonly TEMPLATE_CJS_BROWSER: 'cjs-browser'
    readonly TEMPLATE_CJS_ESM: 'cjs-esm'
    readonly TEMPLATE_ES_SHIM_CONSTRUCTOR: 'es-shim-constructor'
    readonly TEMPLATE_ES_SHIM_PROTOTYPE_METHOD: 'es-shim-prototype-method'
    readonly TEMPLATE_ES_SHIM_STATIC_METHOD: 'es-shim-static-method'
    readonly ecosystems: readonly string[]
    readonly gitExecPath: string
    readonly ignoreGlobs: readonly string[]
    readonly npmPackageNames: readonly string[]
    readonly npmPackagesPath: string
    readonly npmTemplatesPath: string
    readonly npmTemplatesReadmePath: string
    readonly parseArgsConfig: {
      readonly options: {
        readonly force: {
          readonly type: 'boolean'
          readonly short: 'f'
        }
        readonly quiet: {
          readonly type: 'boolean'
        }
      }
      readonly strict: false
    }
    readonly perfNpmPath: string
    readonly perfNpmFixturesPath: string
    readonly registryExtensionsJsonPath: string
    readonly registryManifestJsonPath: string
    readonly registryPkgPath: string
    readonly relNpmPackagesPath: string
    readonly relPackagesPath: string
    readonly relRegistryManifestJsonPath: string
    readonly relRegistryPkgPath: string
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
    readonly allowTestFailuresByEcosystem: Map<string, Set<string>>
    readonly skipTestsByEcosystem: Map<string, Set<string>>
    readonly templatesPath: string
    readonly testNpmPath: string
    readonly testNpmFixturesPath: string
    readonly testNpmNodeModulesPath: string
    readonly testNpmNodeWorkspacesPath: string
    readonly testNpmPkgJsonPath: string
    readonly testNpmPkgLockPath: string
    readonly tsxExecPath: string
    readonly win32EnsureTestsByEcosystem: Map<string, ReadonlySet<string>>
    readonly yarnPkgExtsPath: string
    readonly yarnPkgExtsJsonPath: string
  }
>
export default Constants
