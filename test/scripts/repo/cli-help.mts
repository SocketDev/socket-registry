import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

export async function readCliHelp(script: string) {
  const scriptPath = fileURLToPath(
    new URL('../../../scripts/repo/' + script, import.meta.url),
  )
  return await spawn(process.execPath, [scriptPath, '--help'], {
    stdio: 'pipe',
    stdioString: true,
  })
}
