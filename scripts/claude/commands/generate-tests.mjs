/**
 * @fileoverview Test generation command for Claude CLI.
 * Generates comprehensive test cases for code files.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import { rootPath } from '../config.mjs'
import {
  log,
  prepareClaudeArgs,
  printHeader,
  runCommandWithOutput,
} from '../utils.mjs'

/**
 * Generate test cases for existing code.
 */
async function runTestGeneration(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Test Generation')

  const { positionals = [] } = opts
  const targetFile = positionals[0]

  if (!targetFile) {
    log.error('Please specify a file to generate tests for')
    log.substep('Usage: pnpm claude --test <file>')
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
  const fileName = path.basename(filePath)

  const prompt = `Generate comprehensive test cases for ${fileName}:

${fileContent}

Create unit tests that:
1. Cover all exported functions
2. Test edge cases and error conditions
3. Validate input/output contracts
4. Test async operations properly
5. Include proper setup/teardown
6. Use vitest testing framework
7. Follow Socket testing standards

Output the complete test file content.`

  log.step(`Generating tests for ${fileName}`)
  const result = await runCommandWithOutput(
    claudeCmd,
    prepareClaudeArgs([], opts),
    {
      input: prompt,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )

  if (result.exitCode === 0 && result.stdout) {
    const testDir = path.join(rootPath, 'test')
    if (!existsSync(testDir)) {
      await fs.mkdir(testDir, { recursive: true })
    }

    const testFileName = fileName.replace(/\.(m?[jt]s)$/, '.test.$1')
    const testFilePath = path.join(testDir, testFileName)

    await fs.writeFile(testFilePath, result.stdout.trim())
    log.success(`Test file created: ${testFilePath}`)
  }

  return true
}

export { runTestGeneration }
