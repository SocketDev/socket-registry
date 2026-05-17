/**
 * @fileoverview Validates that commits don't contain too many files.
 *
 * Rules:
 * - No single commit should contain 50+ files
 * - Helps catch accidentally staging too many files or generated content
 * - Prevents overly large commits that are hard to review
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { spawn } from '@socketsecurity/lib/spawn'

import { runValidationScript } from '../util/validation-runner.mts'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..', '..')

// Maximum number of files in a single commit
const MAX_FILES_PER_COMMIT = 50

/**
 * Check if too many files are staged for commit.
 */
export async function validateStagedFileCount() {
  try {
    const gitRootResult = await spawn('git', ['rev-parse', '--show-toplevel'], {
      cwd: rootPath,
      stdioString: true,
    })
    if (!(gitRootResult.stdout as string).trim()) {
      return undefined
    }

    const { stdout } = await spawn('git', ['diff', '--cached', '--name-only'], {
      cwd: rootPath,
      stdioString: true,
    })

    const stagedFiles = (stdout as string)
      .trim()
      .split('\n')
      .filter(line => line.length > 0)

    if (stagedFiles.length >= MAX_FILES_PER_COMMIT) {
      return {
        count: stagedFiles.length,
        files: stagedFiles,
        limit: MAX_FILES_PER_COMMIT,
      }
    }

    return undefined
  } catch {
    // Not a git repo or git not available
    return undefined
  }
}

async function main(): Promise<void> {
  await runValidationScript(
    async () => {
      const violation = await validateStagedFileCount()

      if (violation) {
        logger.log('')
        logger.log(`Staged files: ${violation.count}`)
        logger.log(`Maximum allowed: ${violation.limit}`)
        logger.log('')
        logger.log('Staged files:')
        logger.log('')

        // Show first 20 files, then summary if more.
        const filesToShow = violation.files.slice(0, 20)
        for (let i = 0, { length } = filesToShow; i < length; i += 1) {
          const file = filesToShow[i]
          logger.log(`  ${file}`)
        }

        if (violation.files.length > 20) {
          logger.log(`  ... and ${violation.files.length - 20} more files`)
        }

        logger.log('')
        logger.log(
          'Split into smaller commits, check for accidentally staged files, or exclude generated files.',
        )
        logger.log('')
      }

      return violation
    },
    {
      failureMessage: 'Too many files staged for commit',
      successMessage: 'Commit size is acceptable',
    },
  )
}

main()
