import { readFileSync } from 'node:fs'
import { createRequire, isBuiltin } from 'node:module'
import path from 'node:path'
import { compileFunction, createContext, runInContext } from 'node:vm'

export function createNpmFallbackLoader(options: {
  disabledPaths: readonly string[]
  setupScript?: string | undefined
}) {
  const context = createContext({ disabledPaths: [...options.disabledPaths] })
  runInContext(
    `
    for (const path of disabledPaths) {
      const keys = path.split('.');
      let owner = globalThis;
      if (keys[0] === 'IteratorPrototype') {
        owner = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
        keys.shift();
      }
      const last = keys.pop();
      for (const key of keys) owner = owner[key];
      delete owner[last];
    }
    delete globalThis.disabledPaths;
  `,
    context,
  )
  if (options.setupScript !== undefined) {
    runInContext(options.setupScript, context)
  }
  const cache = new Map<string, { exports: ReturnType<typeof require> }>()
  function loadFile(filename: string): ReturnType<typeof require> {
    const cached = cache.get(filename)
    if (cached) {
      return cached.exports
    }
    const localRequire = createRequire(filename)
    if (path.extname(filename) === '.json') {
      return localRequire(filename)
    }
    const module = { exports: {} }
    cache.set(filename, module)
    const execute = compileFunction(
      readFileSync(filename, 'utf8'),
      ['module', 'exports', 'require'],
      {
        filename,
        parsingContext: context,
      },
    )
    execute(module, module.exports, (specifier: string) =>
      isBuiltin(specifier)
        ? localRequire(specifier)
        : loadFile(localRequire.resolve(specifier)),
    )
    return module.exports
  }
  const errors = runInContext(
    '({ TypeError, RangeError, Error, SyntaxError })',
    context,
  ) as {
    TypeError: typeof TypeError
    RangeError: typeof RangeError
    Error: typeof Error
    SyntaxError: typeof SyntaxError
  }
  return Object.assign(loadFile, { errors })
}
