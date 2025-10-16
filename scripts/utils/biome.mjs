/**
 * @fileoverview Biome formatter utility.
 * Formats content using Biome CLI via pnpm exec.
 */

import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Format content using Biome.
 */
export function biomeFormat(content, options = {}) {
  const { filepath = 'file.json' } = options

  // Create a temporary directory.
  const tmpDir = mkdtempSync(join(tmpdir(), 'biome-format-'))
  const tmpFile = join(tmpDir, filepath.split('/').pop() || 'file.json')

  try {
    // Write content to temp file.
    writeFileSync(tmpFile, content, 'utf8')

    // Run biome format on the temp file.
    execSync(`pnpm exec biome format --write "${tmpFile}"`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    })

    // Read formatted content.
    return readFileSync(tmpFile, 'utf8')
  } finally {
    // Clean up temp directory.
    // Force delete temp directory outside CWD.
    rmSync(tmpDir, { recursive: true, force: true })
  }
}
