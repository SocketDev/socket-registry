/** @fileoverview Type declarations for testing constants. */
export declare function getNpmPackageNames(): string[]
export declare function getEcosystems(): string[]
export declare function getSkipTestsByEcosystem(): Map<string, Set<string>>
export declare function getWin32EnsureTestsByEcosystem(): Map<
  string,
  Set<string>
>
export declare const ALLOW_TEST_FAILURES_BY_ECOSYSTEM: Map<string, Set<string>>
