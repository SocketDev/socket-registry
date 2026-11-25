import { readFileSync, realpathSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export interface ScriptMeta {
  commandBoundary?: '--exec' | 'exec' | undefined
  describe: string
  heavyJob?: 'test' | 'coverage' | 'build' | 'type' | undefined
  help: string
  json?: 'native' | 'result' | undefined
  passthroughArgs?: boolean | undefined
}

export function isMainModule(url: string, entry = process.argv[1]): boolean {
  if (!entry) {
    return false
  }
  try {
    return realpathSync(fileURLToPath(url)) === realpathSync(entry)
  } catch {
    return false
  }
}

export function isJsonRequested(args: readonly string[]): boolean {
  return args.includes('--json')
}

type Main = () => unknown

export function runMain(main: Main, meta?: ScriptMeta): void {
  void runMainAsync(main, meta)
}

export async function runMainAsync(
  main: Main,
  meta?: ScriptMeta,
): Promise<void> {
  try {
    const args = process.argv.slice(2)
    const boundary = meta?.commandBoundary
      ? args.indexOf(meta.commandBoundary)
      : -1
    const options = boundary < 0 ? args : args.slice(0, boundary)
    const passthrough = meta?.passthroughArgs === true
    const describe = options.includes('--describe')
    if (
      meta &&
      describe &&
      (!passthrough ||
        args.every(arg => arg === '--describe' || arg === '--json'))
    ) {
      if (isJsonRequested(options)) {
        const { name, version } = JSON.parse(
          readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
        )
        console.log(
          JSON.stringify({ description: meta.describe, name, version }),
        )
      } else {
        console.log(meta.describe)
      }
      return
    }
    if (
      meta &&
      !passthrough &&
      (options.includes('-h') || options.includes('--help'))
    ) {
      console.log(`${meta.describe}\n\n${meta.help}`)
      return
    }
    if (!passthrough && options.includes('--')) {
      throw new Error('Pass flags directly without a bare --.')
    }
    const result = await main()
    if (typeof result === 'number') {
      process.exitCode = result
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
