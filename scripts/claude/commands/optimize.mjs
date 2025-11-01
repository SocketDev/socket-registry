/**
 * @fileoverview Performance optimization command for Claude CLI.
 * Analyzes code and suggests performance improvements.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import { rootPath } from '../config.mjs'
import { log, printHeader, runClaude } from '../utils.mjs'

/**
 * Optimize code for performance.
 */
async function runOptimization(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Performance Optimization')

  const { positionals = [] } = opts
  const targetFile = positionals[0]

  if (!targetFile) {
    log.error('Please specify a file to optimize')
    log.substep('Usage: pnpm claude --optimize <file>')
    return false
  }

  const filePath = path.isAbsolute(targetFile)
    ? targetFile
    : path.join(rootPath, targetFile)

  if (!existsSync(filePath)) {
    log.error(`File not found: ${targetFile}`)
    return false
  }

  const fileContent = await fs.readFile(filePath, 'utf8')

  const prompt = `Analyze and optimize this code for performance:

${fileContent}

Focus on:
1. Algorithm complexity improvements
2. Memory allocation reduction
3. Async operation optimization
4. Caching opportunities
5. Loop optimizations
6. Data structure improvements
7. V8 optimization tips
8. Bundle size reduction

Provide optimized code with benchmarks/explanations.`

  await runClaude(claudeCmd, prompt, opts)

  return true
}

export { runOptimization }
