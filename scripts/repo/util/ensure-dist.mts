/**
 * @file Ensures dist directory and external dependencies are built. Used by
 *   other scripts to auto-build when needed.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'

import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

import { ROOT_PATH } from '../../constants/paths.mts'

const distPath = path.join(ROOT_PATH, 'registry', 'dist')
const externalPath = path.join(
  distPath,
  'external',
  '@socketregistry',
  'yocto-spinner.js',
)

/**
 * Check if the dist directory and external dependencies exist.
 */
export function isDistBuilt(): boolean {
  return existsSync(externalPath)
}

interface EnsureDistBuiltOptions {
  silent?: boolean | undefined
}

/**
 * Run a minimal build if needed — fast and quiet.
 */
export async function ensureDistBuilt(
  options: EnsureDistBuiltOptions = {},
): Promise<number> {
  const { silent = false } = {
    __proto__: null,
    ...options,
  } as EnsureDistBuiltOptions

  if (isDistBuilt()) {
    return 0
  }

  try {
    const result = await spawn('pnpm', ['build', '--fast', '--needed'], {
      cwd: ROOT_PATH,
      stdio: silent ? 'pipe' : 'inherit',
    })
    return result.code ?? 0
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e) {
      return (e as { code: number }).code
    }
    throw e
  }
}
