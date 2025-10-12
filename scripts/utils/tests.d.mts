/**
 * @fileoverview Type definitions for tests.mjs
 */

export function cleanTestScript(script: string): string
export function getTestCommand(packageName: string, script: string): string[]
export function shouldSkipTest(packageName: string): boolean
export function isPackageTestingSkipped(packageName: string): boolean

export const testRunners: {
  test: string[]
  tests: string[]
  'test:node': string[]
  'test:unit': string[]
  'test:integration': string[]
}
