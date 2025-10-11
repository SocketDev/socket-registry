/**
 * @fileoverview Security-related validation schemas.
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
      error: undefined
    }),
    parse: (data: any) => data,
    _name: name
  }
}

/**
 * Socket scan result schema.
 */
export const SocketScanResultSchema = createSchema('SocketScanResult')

/**
 * SLSA provenance schema.
 */
export const SlsaProvenanceSchema = createSchema('SlsaProvenance')