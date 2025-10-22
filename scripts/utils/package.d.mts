/**
 * @fileoverview Type definitions for package.mjs
 */

export declare const PNPM_NPM_LIKE_FLAGS: readonly string[]
export declare const PNPM_INSTALL_BASE_FLAGS: readonly string[]
export declare const PNPM_HOISTED_INSTALL_FLAGS: readonly string[]
export declare const PNPM_INSTALL_ENV: Record<string, undefined>
export declare const editablePackageJsonCache: Map<string, any>

export declare function readCachedEditablePackageJson(
  pkgPath: string,
  // biome-ignore lint/suspicious/noExplicitAny: Options object accepts any additional properties.
  options?: Record<string, any>,
): Promise<any>

export declare function clearPackageJsonCache(): void

export declare function updatePackagesJson(
  packages: Array<{ path: string; updates: Record<string, any> }>,
  options?: {
    concurrency?: number
    // biome-ignore lint/suspicious/noExplicitAny: Spinner type from external library.
    spinner?: any
  },
): Promise<void>

export declare function collectPackageData(
  paths: string[],
  options?: {
    concurrency?: number
    fields?: string[]
  },
): Promise<Array<Record<string, any>>>

export declare function processWithSpinner<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options?: {
    concurrency?: number
    errorMessage?: string
    // biome-ignore lint/suspicious/noExplicitAny: Spinner type from external library.
    spinner?: any
    startMessage?: string
    successMessage?: string
  },
): Promise<{ results: R[]; errors: Array<{ item: any; error: Error }> }>

export declare function resolveRealPath(pathStr: string): Promise<string>

export declare function computeOverrideHash(
  overridePath: string,
): Promise<string>

export declare function copySocketOverride(
  fromPath: string,
  toPath: string,
  options?: {
    excludePackageJson?: boolean
  },
): Promise<void>

export declare function buildTestEnv(
  packageTempDir: string,
  installedPath: string,
): Record<string, string | undefined>

export declare function runCommand(
  command: string,
  args: string[],
  options?: {
    cwd?: string
    env?: Record<string, string | undefined>
    stdio?: 'pipe' | 'inherit' | 'ignore'
    shell?: boolean
  },
): Promise<{ stdout: string; stderr: string }>

export declare function installPackageForTesting(
  sourcePath: string,
  packageName: string,
  options?: {
    versionSpec?: string
  },
): Promise<{
  installed: boolean
  packagePath?: string
  reason?: string
}>
