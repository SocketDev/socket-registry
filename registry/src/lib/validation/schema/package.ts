/**
 * @fileoverview Package-related validation schemas.
 */

import type { Schema } from '../types'

/**
 * Create a mock schema for testing.
 */
function createSchema<T = any>(name: string): Schema<T> {
  return {
    safeParse: (data: any) => ({
      success: true,
      data,
      error: undefined,
    }),
    parse: (data: any) => data,
    _name: name,
  }
}

/**
 * Package.json schema.
 */
export const PackageJsonSchema = createSchema('PackageJson')

/**
 * NPM packument schema.
 */
export const NpmPackumentSchema = createSchema('NpmPackument')

/**
 * NPM audit schema.
 */
export const NpmAuditSchema = createSchema('NpmAudit')
