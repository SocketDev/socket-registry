/**
 * @fileoverview Glob matching utilities for scripts.
 */

import { minimatch } from 'minimatch'

/**
 * Creates a glob matcher function.
 * @param {string|string[]} patterns - Glob pattern(s) to match
 * @param {object} options - Minimatch options
 * @returns {function} Matcher function that returns true/false
 */
export function getGlobMatcher(patterns, options = {}) {
  const opts = { __proto__: null, ...options }
  const patternArray = Array.isArray(patterns) ? patterns : [patterns]

  // If no patterns provided, match nothing
  if (!patternArray.length) {
    return () => false
  }

  // Separate include and exclude patterns
  const includes = []
  const excludes = []

  for (const pattern of patternArray) {
    if (pattern.startsWith('!')) {
      excludes.push(pattern.slice(1))
    } else {
      includes.push(pattern)
    }
  }

  // If only exclusion patterns, include everything by default
  if (!includes.length && excludes.length) {
    includes.push('**')
  }

  return (filepath) => {
    // Check if path matches any include pattern
    const matchesInclude = includes.length === 0 ||
      includes.some(pattern => minimatch(filepath, pattern, opts))

    if (!matchesInclude) {
      return false
    }

    // Check if path matches any exclude pattern
    const matchesExclude = excludes.some(pattern => minimatch(filepath, pattern, opts))

    return !matchesExclude
  }
}

/**
 * Default ignore patterns for file traversal.
 */
export const defaultIgnore = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.cache/**',
  '**/.tmp/**',
  '**/tmp/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
  '**/.vite/**',
]