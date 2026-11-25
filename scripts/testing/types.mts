export interface FailureDetails {
  [key: string]: string
}

export interface FailurePatternDef {
  pattern: RegExp
  category: string
  severity: 'error' | 'warning'
  extract?: ((match: RegExpMatchArray) => FailureDetails) | undefined
  suggestions: string[]
}

export interface Failure {
  type: string
  category: string
  severity: string
  line: string
  package: string | undefined
  suggestions: string[]
  details?: FailureDetails | undefined
}

export interface CategoryRecommendation {
  level: 'category'
  category: string
  count: number
  suggestions: string[]
}

export interface PackageRecommendation {
  level: 'package'
  package: string
  count: number
  issues: Array<{ category: string; details: FailureDetails | undefined }>
  actions: string[]
}

export type Recommendation = CategoryRecommendation | PackageRecommendation

export interface ValidationIssue {
  type: string
  severity: string
  message: string
}

export interface ValidationResult {
  packageName: string
  issues: ValidationIssue[]
  hasErrors: boolean
  hasWarnings: boolean
}
