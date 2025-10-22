/**
 * @fileoverview Type definitions for tests.mjs
 */

export declare function getCliArgs(): { force?: boolean; quiet?: boolean }
export declare function shouldRunTests(): boolean
export declare function isPackageTestingSkipped(
  eco: string,
  packageName: string,
): boolean
