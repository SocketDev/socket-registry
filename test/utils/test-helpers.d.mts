/** @fileoverview TypeScript declaration for test-helpers.mjs module. */

interface IsolatePackageOptions {
  imports?: Record<string, string>
}

interface IsolatePackageResult {
  exports?: Record<string, any>
  tmpdir: string
}

interface SetupMultiEntryTestResult {
  modules: any[]
  tmpdir: string
}

export declare function isolatePackage(
  packageSpec: string,
  options?: IsolatePackageOptions,
): Promise<IsolatePackageResult>

export declare function setupMultiEntryTest(
  packageSpec: string,
  entryPoints?: string[],
): Promise<SetupMultiEntryTestResult>
