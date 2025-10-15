/**
 * @fileoverview Non-barrel imports to avoid bundling unnecessary code.
 * Instead of importing entire packages, import only specific functions/modules we use.
 */

export const nonBarrelImports = {
  // Semver package has individual function exports we can use.
  // DISABLED: The non-barrel approach doesn't work well because we need many
  // range functions that aren't in the functions/ directory.
  'semver-disabled': {
    // Instead of: const semver = require('semver')
    // We can import individual functions from semver/functions/*
    customEntry: `
      // Import ONLY the semver functions we actually use.
      // Each is a separate module, avoiding the barrel file overhead.
      module.exports = {
        parse: require('semver/functions/parse'),
        valid: require('semver/functions/valid'),
        clean: require('semver/functions/clean'),
        compare: require('semver/functions/compare'),
        rcompare: require('semver/functions/rcompare'),
        compareLoose: require('semver/functions/compare-loose'),
        compareBuild: require('semver/functions/compare-build'),
        sort: require('semver/functions/sort'),
        rsort: require('semver/functions/rsort'),

        gt: require('semver/functions/gt'),
        lt: require('semver/functions/lt'),
        eq: require('semver/functions/eq'),
        neq: require('semver/functions/neq'),
        gte: require('semver/functions/gte'),
        lte: require('semver/functions/lte'),

        inc: require('semver/functions/inc'),
        diff: require('semver/functions/diff'),
        major: require('semver/functions/major'),
        minor: require('semver/functions/minor'),
        patch: require('semver/functions/patch'),
        prerelease: require('semver/functions/prerelease'),

        satisfies: require('semver/functions/satisfies'),
        coerce: require('semver/functions/coerce'),

        // Re-export as default for compatibility.
        default: require('semver/functions/satisfies')
      };

      // This avoids importing the SemVer class, Range class, and other
      // heavy components we don't use, saving ~30-40% of semver's size.
    `,
  },

  chalk: {
    // If we were using chalk, we could import specific modules.
    customEntry: `
      // Import only the chalk modules we need.
      const { Chalk } = require('chalk/source/index.js');
      const chalk = new Chalk({ level: 2 }); // Force color level

      module.exports = chalk;
      module.exports.default = chalk;
    `,
  },

  lodash: {
    // Lodash has individual function modules.
    customEntry: `
      // Import specific lodash functions instead of the entire library.
      module.exports = {
        get: require('lodash/get'),
        set: require('lodash/set'),
        merge: require('lodash/merge'),
        cloneDeep: require('lodash/cloneDeep'),
        debounce: require('lodash/debounce'),
        throttle: require('lodash/throttle'),
        isEqual: require('lodash/isEqual'),
        isEmpty: require('lodash/isEmpty'),
        omit: require('lodash/omit'),
        pick: require('lodash/pick'),
        // Add only functions we actually use.
      };
    `,
  },

  rxjs: {
    // RxJS has deep imports for operators.
    customEntry: `
      // Import only the RxJS components we use.
      module.exports = {
        Observable: require('rxjs/internal/Observable').Observable,
        Subject: require('rxjs/internal/Subject').Subject,
        from: require('rxjs/internal/observable/from').from,
        of: require('rxjs/internal/observable/of').of,
        map: require('rxjs/internal/operators/map').map,
        filter: require('rxjs/internal/operators/filter').filter,
        tap: require('rxjs/internal/operators/tap').tap,
        catchError: require('rxjs/internal/operators/catchError').catchError,
        // Avoid importing all operators through the barrel.
      };
    `,
  },

  'date-fns': {
    // date-fns has individual function exports.
    customEntry: `
      // Import only the date functions we use.
      module.exports = {
        format: require('date-fns/format'),
        parseISO: require('date-fns/parseISO'),
        isValid: require('date-fns/isValid'),
        addDays: require('date-fns/addDays'),
        subDays: require('date-fns/subDays'),
        differenceInDays: require('date-fns/differenceInDays'),
        // Each function is ~2-5KB, vs 200KB+ for the entire library.
      };
    `,
  },

  '@sindresorhus/is': {
    // This package has a barrel file that exports everything.
    customEntry: `
      // Import only the type checks we use.
      const is = require('@sindresorhus/is/dist/source/index.js');

      // Re-export only what we need.
      module.exports = {
        string: is.string,
        number: is.number,
        boolean: is.boolean,
        object: is.object,
        array: is.array,
        function: is.function_,
        undefined: is.undefined_,
        null: is.null_,
        // Skip exotic type checks we don't use.
      };
    `,
  },

  globby: {
    // Globby wraps fast-glob with additional features.
    customEntry: `
      // Import only the globby functions we use.
      const {globby, globbySync} = require('globby');

      module.exports = globby;
      module.exports.sync = globbySync;
      module.exports.default = globby;

      // Skip gitignore, generateGlobTasks, isDynamicPattern, etc.
    `,
  },
}

/**
 * Analyze which functions from a package are actually used.
 * This helps identify opportunities for non-barrel imports.
 */
export async function analyzePackageUsage(packageName, sourceDir) {
  const fs = await import('node:fs').then(m => m.promises)
  const path = await import('node:path')
  const fastGlob = await import('fast-glob')

  // Find all JS/TS files in the source directory.
  const files = await fastGlob.glob(['**/*.{js,mjs,cjs,ts,mts,cts}'], {
    cwd: sourceDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/test/**'],
  })

  const usage = new Set()
  const importPatterns = [
    // CommonJS: const {fn} = require('package')
    new RegExp(
      `const\\s*{([^}]+)}\\s*=\\s*require\\(['"\`]${packageName}['"\`]\\)`,
      'g',
    ),
    // CommonJS: const pkg = require('package'); pkg.fn()
    new RegExp(
      `const\\s+(\\w+)\\s*=\\s*require\\(['"\`]${packageName}['"\`]\\)[;\\s]+(\\1\\.(\\w+))`,
      'g',
    ),
    // ES modules: import {fn} from 'package'
    new RegExp(
      `import\\s*{([^}]+)}\\s*from\\s*['"\`]${packageName}['"\`]`,
      'g',
    ),
    // ES modules: import * as pkg from 'package'; pkg.fn()
    new RegExp(
      `import\\s*\\*\\s*as\\s+(\\w+)\\s*from\\s*['"\`]${packageName}['"\`][;\\s]+(\\1\\.(\\w+))`,
      'g',
    ),
  ]

  for (const file of files) {
    const content = await fs.readFile(path.join(sourceDir, file), 'utf8')

    for (const pattern of importPatterns) {
      let match = pattern.exec(content)
      while (match !== null) {
        // Extract function names from destructuring or property access.
        const functions = match[1] || match[3]
        if (functions) {
          functions.split(',').forEach(fn => {
            usage.add(fn.trim().replace(/\s+as\s+\w+/, ''))
          })
        }
        match = pattern.exec(content)
      }
    }
  }

  return Array.from(usage)
}

/**
 * Generate a custom entry file using non-barrel imports.
 */
export async function createNonBarrelEntry(packageName, _tempDir) {
  const fs = await import('node:fs').then(m => m.promises)
  const path = await import('node:path')
  const { createRequire } = await import('node:module')

  const config = nonBarrelImports[packageName]
  if (!config?.customEntry) {
    // Use default entry.
    return null
  }

  // Create temp entry file in project root where node_modules is accessible.
  // Use a .tmp directory that's gitignored.
  const tmpDir = path.join(process.cwd(), '.tmp-build')
  await fs.mkdir(tmpDir, { recursive: true })

  const tempFile = path.join(
    tmpDir,
    `${packageName.replace(/[/@]/g, '-')}-entry.js`,
  )

  // Write the custom entry with adjusted require paths if needed.
  const entryContent = config.customEntry.trim()

  // For semver, we need to ensure the paths resolve correctly.
  if (packageName === 'semver') {
    // Create a require function from the temp file location.
    const req = createRequire(tempFile)

    // Verify that the paths exist before writing.
    try {
      req.resolve('semver/functions/parse')
      // Paths are valid, use the original entry.
    } catch {
      // Paths don't resolve, fall back to regular import.
      console.log(
        `  Note: Non-barrel imports not available for ${packageName}, using default entry`,
      )
      await fs.rm(tmpDir, { recursive: true, force: true })
      return null
    }
  }

  await fs.writeFile(tempFile, entryContent)

  return tempFile
}
