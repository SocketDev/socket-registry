/**
 * @fileoverview Custom esbuild plugin for aggressive optimizations.
 */

export const optimizePlugin = {
  name: 'optimize',
  setup(build) {
    // Transform JavaScript files.
    build.onLoad({ filter: /\.(js|mjs|cjs)$/ }, async args => {
      const fs = require('node:fs').promises
      let contents = await fs.readFile(args.path, 'utf8')

      // 1. Strip verbose error messages (keep error codes only).
      contents = contents.replace(
        /throw\s+new\s+Error\(['"`]([^'"`]{100,})['"`]\)/g,
        (_match, msg) => {
          const code = msg.match(/\b[A-Z][A-Z0-9_]+\b/) || ['ERR_UNKNOWN']
          return `throw new Error('${code[0]}')`
        },
      )

      // 2. Strip documentation URLs from error messages.
      contents = contents.replace(/https?:\/\/[^\s"')]+docs[^\s"')]*/g, '')

      // 3. Remove package.json metadata readers (version checks, etc).
      contents = contents.replace(
        /JSON\.parse\([^)]*readFileSync\([^)]*package\.json[^)]*\)[^)]*\)/g,
        '{}',
      )

      // 4. Strip stack trace enhancements.
      contents = contents.replace(/Error\.captureStackTrace\([^)]+\);?/g, '')

      // 5. Remove deprecation warnings.
      contents = contents.replace(
        /console\.(warn|error)\([^)]*deprecat[^)]*\);?/gi,
        '',
      )

      // 6. Strip assertion messages (keep just the check).
      contents = contents.replace(
        /assert\([^,]+,\s*['"`][^'"`]+['"`]\)/g,
        match => {
          const condition = match.match(/assert\(([^,]+),/)[1]
          return `assert(${condition})`
        },
      )

      // 7. Remove CLI help text and usage strings.
      contents = contents.replace(/['"`]Usage:[\s\S]{50,}?['"`]/g, '""')

      // 8. Strip ANSI color codes and formatting.
      contents = contents.replace(/\\x1b\[[0-9;]*m/g, '')

      return { contents }
    })
  },
}

export const dedupePlugin = {
  name: 'dedupe',
  setup(build) {
    // Track common modules to dedupe them.
    const commonModules = new Map()

    build.onResolve({ filter: /.*/ }, args => {
      // Dedupe common heavy dependencies.
      const dedupeTargets = [
        'readable-stream',
        'safe-buffer',
        'string_decoder',
        'inherits',
        'util-deprecate',
        'process-nextick-args',
      ]

      for (const target of dedupeTargets) {
        if (args.path.includes(target)) {
          if (!commonModules.has(target)) {
            commonModules.set(target, args.path)
          }
          return { path: commonModules.get(target) }
        }
      }
    })
  },
}

export const dataExtractionPlugin = {
  name: 'extract-data',
  setup(build) {
    build.onLoad({ filter: /\.(json)$/ }, async args => {
      const fs = require('node:fs').promises
      const contents = await fs.readFile(args.path, 'utf8')
      const data = JSON.parse(contents)

      // For large JSON data files, only keep essential fields.
      if (contents.length > 10_000) {
        // Example: package.json files often have huge 'readme' fields.
        delete data.readme
        delete data.readmeFilename
        delete data.changelog
        delete data._id
        delete data._from
        delete data._resolved
        delete data._integrity
        delete data._shasum

        return { contents: JSON.stringify(data) }
      }

      return { contents }
    })
  },
}
