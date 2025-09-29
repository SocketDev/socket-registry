/** @fileoverview TypeScript declaration for package-utils.mjs module. */

interface ProcessOptions {
  concurrency?: number
  failFast?: boolean
  spinner?: any
}

interface RunCommandOptions {
  cwd?: string
  env?: Record<string, string>
  stdio?: string
}

interface ReadPackageOptions {
  cache?: boolean
}

interface UpdatePackagesOptions {
  concurrency?: number
  dryRun?: boolean
}

export declare const editablePackageJsonCache: Map<string, any>

export declare function clearPackageJsonCache(): void

export declare function collectPackageData(
  paths: string[],
  options?: ProcessOptions | undefined,
): Promise<any[]>

export declare function installPackageForTesting(
  socketPkgName: string,
): Promise<{ installed: boolean; packagePath?: string; reason?: string }>

export declare function processWithSpinner<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options?: ProcessOptions | undefined,
): Promise<R[]>

export declare function readCachedEditablePackageJson(
  pkgPath: string,
  options?: ReadPackageOptions | undefined,
): Promise<any>

export interface CommandResult {
  stdout: string
  stderr: string
  code: number
}

export declare function runCommand(
  command: string,
  args: string[],
  options?: RunCommandOptions | undefined,
): Promise<CommandResult>

export declare function updatePackagesJson(
  packages: string[],
  options?: UpdatePackagesOptions | undefined,
): Promise<void>
