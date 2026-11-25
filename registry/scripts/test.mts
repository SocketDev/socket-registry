/**
 * @file Registry package test runner.
 */

import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

const logger = getDefaultLogger()
const WIN32 = process.platform === 'win32'
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const repoRoot = path.resolve(packageRoot, '..')
const vitestBin = path.join(
  repoRoot,
  'node_modules',
  '.bin',
  WIN32 ? 'vitest.cmd' : 'vitest',
)

async function main(): Promise<void> {
  try {
    const result = await spawn(vitestBin, process.argv.slice(2), {
      cwd: packageRoot,
      shell: WIN32,
      stdio: 'inherit',
    })
    process.exitCode = result.code ?? 0
  } catch (error) {
    logger.error(errorMessage(error))
    process.exitCode = 1
  }
}

void main()
