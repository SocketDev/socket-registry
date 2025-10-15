/**
 * @fileoverview Type definitions for package.mjs
 */

export interface TestRunResult {
  passed: boolean
  output: string
  exitCode: number
  error?: Error
}

export interface TestOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
}

export function getInstalledPackages(tempDir: string): Promise<string[]>
export function installPackage(
  packagePath: string,
  tempDir: string,
  // biome-ignore lint/suspicious/noExplicitAny: Options object accepts any additional properties.
  options?: Record<string, any>,
): Promise<void>
export function installPackageForTesting(
  sourcePath: string,
  packageName: string,
  // biome-ignore lint/suspicious/noExplicitAny: Options object accepts any additional properties.
  options?: Record<string, any>,
): Promise<{
  installed: boolean
  packagePath?: string
  reason?: string
}>
export function runPackageTests(
  packageName: string,
  tempDir: string,
  options?: TestOptions,
): Promise<TestRunResult>
export function processWithConcurrency<T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options?: {
    concurrency?: number
    startMessage?: string
    errorMessage?: string
    // biome-ignore lint/suspicious/noExplicitAny: Spinner type from external library.
    spinner?: any
  },
): Promise<void>
