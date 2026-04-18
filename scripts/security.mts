/** @fileoverview Run local security scans (agentshield + zizmor). Cross-platform wrapper. */

import process from 'node:process'

import which from 'which'

import { WIN32 } from '@socketsecurity/lib/constants/platform'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { spawn } from '@socketsecurity/lib/spawn'

const logger = getDefaultLogger()

async function hasExecutable(name: string): Promise<boolean> {
  try {
    await which(name)
    return true
  } catch {
    return false
  }
}

async function runTool(command: string, args: string[]): Promise<number> {
  try {
    const result = await spawn(command, args, {
      stdio: 'inherit',
      shell: WIN32,
    })
    return result.code ?? 1
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e) {
      const code = (e as { code: unknown }).code
      return typeof code === 'number' ? code : 1
    }
    throw e
  }
}

async function main(): Promise<void> {
  if (!(await hasExecutable('agentshield'))) {
    logger.info('agentshield not installed; run "pnpm run setup" to install')
  } else {
    const agentshieldCode = await runTool('agentshield', ['scan'])
    if (agentshieldCode !== 0) {
      process.exitCode = agentshieldCode
      return
    }
  }

  if (!(await hasExecutable('zizmor'))) {
    logger.info('zizmor not installed; run "pnpm run setup" to install')
    return
  }

  const zizmorCode = await runTool('zizmor', ['.github/'])
  if (zizmorCode !== 0) {
    process.exitCode = zizmorCode
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
