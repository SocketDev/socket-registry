import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

async function cleanTestCache() {
  const dirs = [
    path.join(os.homedir(), '.socket-npm-test-cache'),
    path.join(os.tmpdir(), 'npm-package-tests'),
  ]

  for (const dir of dirs) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await fs.rm(dir, { recursive: true, force: true })
      console.log('Removed:', dir)
    } catch {
      // Silently ignore errors (directory might not exist).
    }
  }
}

cleanTestCache().catch(console.error)
