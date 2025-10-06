/** @fileoverview TypeScript declaration for test-helpers.mjs module. */

interface IsolatePackageOptions {
  imports?: Record<string, string>
}

interface IsolatePackageResult {
  exports?: Record<string, any>
  tmpdir: string
}

export declare function isolatePackage(
  packageSpec: string,
  options?: IsolatePackageOptions,
): Promise<IsolatePackageResult>
