/**
 * @fileoverview Coverage utilities for code and type coverage reporting.
 */

export { getCodeCoverage } from './code-coverage'
export { formatCoverage, getCoverageEmoji } from './formatters'
export { getTypeCoverage } from './type-coverage'
export type {
  CodeCoverageResult,
  CoverageFormat,
  CoverageMetric,
  FormatCoverageOptions,
  GetCodeCoverageOptions,
  GetTypeCoverageOptions,
  TypeCoverageResult,
  V8CoverageData,
  V8FileCoverage,
} from './types'
