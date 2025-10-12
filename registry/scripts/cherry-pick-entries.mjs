/**
 * @fileoverview Cherry-picked entry points for external packages.
 * Only imports what we actually use from each package, dramatically reducing bundle size.
 */

export const cherryPickEntries = {
  // Cherry-picking for a FEATURE-RICH CLI application.
  // We keep all user-facing features and only optimize internals.

  // For packages where we can cherry-pick specific exports.
  // NOTE: These require more complex handling and are disabled for now.
  // They could save significant space but need proper module resolution.

  /*
  'semver': {
    // Instead of bundling ALL of semver, just get what we use.
    customEntry: `
      const semver = require('semver/functions/parse');
      const compare = require('semver/functions/compare');
      const satisfies = require('semver/functions/satisfies');
      const coerce = require('semver/functions/coerce');
      const valid = require('semver/functions/valid');
      const clean = require('semver/functions/clean');
      const inc = require('semver/functions/inc');
      const diff = require('semver/functions/diff');
      const major = require('semver/functions/major');
      const minor = require('semver/functions/minor');
      const patch = require('semver/functions/patch');
      const prerelease = require('semver/functions/prerelease');
      const eq = require('semver/functions/eq');
      const neq = require('semver/functions/neq');
      const gt = require('semver/functions/gt');
      const gte = require('semver/functions/gte');
      const lt = require('semver/functions/lt');
      const lte = require('semver/functions/lte');
      const rcompare = require('semver/functions/rcompare');
      const sort = require('semver/functions/sort');
      const rsort = require('semver/functions/rsort');

      module.exports = {
        parse: semver,
        compare,
        satisfies,
        coerce,
        valid,
        clean,
        inc,
        diff,
        major,
        minor,
        patch,
        prerelease,
        eq,
        neq,
        gt,
        gte,
        lt,
        lte,
        rcompare,
        sort,
        rsort,
        // Add commonly used as direct exports.
        default: { parse: semver, compare, satisfies, coerce, valid, clean, inc, eq, gt, gte, lt, lte }
      };
    `,
    // Functions we know we don't use and can skip.
    skipFunctions: [
      'minVersion',
      'minSatisfying',
      'maxSatisfying',
      'toComparators',
      'simplifyRange',
      'subset',
      'validRange',
      // All the Range class methods we don't use.
      'Range',
      'SemVer',
      'Comparator',
    ],
  },

  'yargs-parser': {
    // Yargs-parser has a lot of features we don't need.
    customEntry: `
      const parser = require('yargs-parser');

      // Create a minimal wrapper that only exposes what we use.
      module.exports = function parse(args, opts) {
        // We only use basic parsing, not the advanced features.
        const minimalOpts = {
          boolean: opts?.boolean || [],
          string: opts?.string || [],
          alias: opts?.alias || {},
          default: opts?.default || {},
          // Skip features we don't use.
          configuration: {
            'camel-case-expansion': false,
            'dot-notation': false,
            'parse-numbers': false,
            'boolean-negation': false,
            'combine-arrays': false,
            'duplicate-arguments-array': false,
            'flatten-duplicate-arrays': false,
            'negation-prefix': 'no-',
            'populate--': false,
            'set-placeholder-key': false,
            'strip-aliased': false,
            'strip-dashed': false,
            'unknown-options-as-args': false,
          }
        };

        return parser(args, minimalOpts);
      };

      module.exports.default = module.exports;
    `,
  },

  'debug': {
    // Debug package - in production we can use a minimal stub.
    customEntry: `
      // Minimal debug implementation for production.
      // Since process.env.DEBUG is undefined, all debug calls are no-ops.
      function createDebug() {
        const noop = () => {};
        noop.enabled = false;
        noop.color = '';
        noop.diff = 0;
        noop.namespace = '';
        noop.destroy = () => {};
        noop.extend = () => createDebug();
        return noop;
      }

      createDebug.enable = () => {};
      createDebug.disable = () => {};
      createDebug.enabled = () => false;
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      createDebug.selectColor = () => '';
      createDebug.humanize = () => '';

      module.exports = createDebug;
      module.exports.default = createDebug;
    `,
  },

  'picomatch': {
    // Picomatch - we mainly use the main function, not all the utilities.
    customEntry: `
      const picomatch = require('picomatch/lib/picomatch');

      // Only export what we actually use.
      module.exports = picomatch;
      module.exports.default = picomatch;

      // Common methods we might use.
      module.exports.isMatch = picomatch.isMatch || ((str, pattern, options) => {
        const isMatch = picomatch(pattern, options);
        return isMatch(str);
      });

      module.exports.parse = picomatch.parse || (() => ({}));
      module.exports.compile = picomatch.compile || ((ast) => picomatch(ast));
    `,
  },

  'fast-glob': {
    // Fast-glob - we use sync and async, but not stream.
    customEntry: `
      const fg = require('fast-glob');

      // Only export the methods we use.
      module.exports = fg.glob || fg;
      module.exports.default = module.exports;
      module.exports.glob = fg.glob || fg;
      module.exports.sync = fg.sync || fg.globSync;
      module.exports.async = fg.async || fg;

      // We don't use stream or generateTasks.
      // This allows tree-shaking to remove those code paths.
    `,
  },

  'del': {
    // Del - we only need the main delete function.
    customEntry: `
      const {deleteAsync} = require('del');

      // Only export what we use.
      module.exports = deleteAsync;
      module.exports.default = deleteAsync;
      module.exports.deleteAsync = deleteAsync;

      // We don't use deleteSync or the legacy patterns.
    `,
  },

  'zod': {
    // Zod - cherry-pick only the validators we actually use.
    customEntry: `
      const z = require('zod');

      // Only export the parts of Zod we actually use.
      module.exports = {
        // Core types we use.
        string: z.string,
        number: z.number,
        boolean: z.boolean,
        object: z.object,
        array: z.array,
        enum: z.enum,
        union: z.union,
        optional: z.optional,
        nullable: z.nullable,
        literal: z.literal,
        record: z.record,
        unknown: z.unknown,
        any: z.any,
        void: z.void,
        never: z.never,

        // Methods we use.
        parse: (schema, data) => schema.parse(data),
        safeParse: (schema, data) => schema.safeParse(data),

        // Type utilities.
        infer: z.infer,
        input: z.input,
        output: z.output,

        // Default export.
        default: z.default || z,

        // We DON'T include:
        // - Error maps and i18n
        // - Transformers
        // - Branded types
        // - Lazy types
        // - Effects
        // - Discriminated unions
        // - Native enums
        // - Catch
        // - Pipeline
        // - Coerce
      };
    `,
  },

  */

  // For validation packages, we can use simpler validators in production.
  'validate-npm-package-name': {
    // Simplified package name validation.
    customEntry: `
      // Minimal npm package name validator.
      // Based on npm's actual rules but without all the detailed error messages.
      module.exports = function validate(name) {
        const errors = [];
        const warnings = [];

        if (!name) {
          errors.push('name cannot be empty');
          return {validForNewPackages: false, validForOldPackages: false, errors, warnings};
        }

        if (name.length > 214) {
          errors.push('name too long');
          return {validForNewPackages: false, validForOldPackages: false, errors, warnings};
        }

        if (name[0] === '.' || name[0] === '_') {
          errors.push('name cannot start with . or _');
          return {validForNewPackages: false, validForOldPackages: false, errors, warnings};
        }

        if (!/^[a-z0-9._-]+$/.test(name.split('/').pop())) {
          errors.push('name can only contain lowercase letters, numbers, dots, dashes, underscores');
          return {validForNewPackages: false, validForOldPackages: false, errors, warnings};
        }

        // Scoped package check.
        if (name[0] === '@') {
          if (!name.includes('/')) {
            errors.push('scoped package must have a slash');
            return {validForNewPackages: false, validForOldPackages: false, errors, warnings};
          }
          const parts = name.split('/');
          if (parts.length !== 2 || !parts[0] || !parts[1]) {
            errors.push('invalid scoped package name');
            return {validForNewPackages: false, validForOldPackages: false, errors, warnings};
          }
        }

        return {
          validForNewPackages: errors.length === 0,
          validForOldPackages: errors.length === 0,
          errors,
          warnings
        };
      };

      module.exports.default = module.exports;
    `,
  },

  // For logging, we can use stubs in production.
  'yoctocolors-cjs': {
    // No colors in production bundles.
    customEntry: `
      // No-op color functions for production.
      const identity = str => str;
      module.exports = {
        red: identity,
        green: identity,
        yellow: identity,
        blue: identity,
        magenta: identity,
        cyan: identity,
        white: identity,
        gray: identity,
        black: identity,
        bold: identity,
        dim: identity,
        italic: identity,
        underline: identity,
        strikethrough: identity,
        reset: identity,
        default: identity
      };
    `,
  },
}

// Generate a temporary entry file for cherry-picked imports.
export async function createCherryPickEntry(packageName, tempDir) {
  const fs = await import('node:fs').then(m => m.promises)
  const path = await import('node:path')

  const config = cherryPickEntries[packageName]
  if (!config?.customEntry) {
    return null // Use default entry.
  }

  // Create temp entry file.
  const tempFile = path.join(
    tempDir,
    `${packageName.replace(/[/@]/g, '-')}-entry.js`,
  )
  await fs.writeFile(tempFile, config.customEntry.trim())

  return tempFile
}
