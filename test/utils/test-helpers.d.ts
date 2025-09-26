/** @fileoverview TypeScript declaration for test-helpers.mjs module. */

interface MultiEntryTestResult<T = unknown> {
  pkgPath: string
  modules: T[]
}

interface TestResult {
  pkgPath: string
}

export declare function setupMultiEntryTest<T = unknown>(
  sockRegPkgName: string,
  entryPoints: string[],
): Promise<MultiEntryTestResult<T>>

export declare function setupPackageTest(
  sockRegPkgName: string,
): Promise<TestResult>
