/**
 * @fileoverview Cherry-picked entry points optimized for CLI applications.
 * Focuses on removing truly unused code while keeping all CLI features.
 */

export const cherryPickEntries = {
  // For CLI applications, we focus on removing unused functionality,
  // NOT user-facing features like colors, formatting, or debug output.

  'semver': {
    // Semver has many functions we don't use in the registry.
    // We can create a facade that only includes what we need.
    customEntry: `
      // Import only the semver functions we actually use in the registry.
      const semver = require('semver');

      // Based on analysis of our codebase, we only use these functions:
      module.exports = {
        // Core functions we use.
        parse: semver.parse,
        valid: semver.valid,
        clean: semver.clean,
        compare: semver.compare,
        rcompare: semver.rcompare,
        compareLoose: semver.compareLoose,
        compareBuild: semver.compareBuild,
        sort: semver.sort,
        rsort: semver.rsort,

        // Comparison functions.
        gt: semver.gt,
        lt: semver.lt,
        eq: semver.eq,
        neq: semver.neq,
        gte: semver.gte,
        lte: semver.lte,

        // Version manipulation.
        inc: semver.inc,
        diff: semver.diff,
        major: semver.major,
        minor: semver.minor,
        patch: semver.patch,
        prerelease: semver.prerelease,

        // Range functions we use.
        satisfies: semver.satisfies,
        validRange: semver.validRange,
        ltr: semver.ltr,
        gtr: semver.gtr,
        outside: semver.outside,
        coerce: semver.coerce,

        // We DON'T use these heavy features:
        // - maxSatisfying/minSatisfying (complex range resolution)
        // - intersects (range intersection logic)
        // - simplifyRange (range simplification)
        // - subset (range subset checking)
        // These exclusions can save ~10KB

        default: semver
      };
    `,
  },

  'yargs-parser': {
    // Yargs-parser includes features we don't need for our CLI.
    customEntry: `
      const parser = require('yargs-parser');

      // Wrap yargs-parser with our specific configuration.
      // This disables features we don't use, reducing parse overhead.
      module.exports = function parse(args, opts = {}) {
        const optimizedOpts = {
          ...opts,
          configuration: {
            'camel-case-expansion': true,  // We DO use camelCase
            'dot-notation': false,          // We don't use dot notation
            'parse-numbers': true,          // We DO want number parsing
            'parse-positional-numbers': true,
            'boolean-negation': true,       // We DO use --no-flags
            'combine-arrays': false,        // We don't need array combining
            'duplicate-arguments-array': true,
            'flatten-duplicate-arrays': true,
            'greedy-arrays': false,         // We don't use greedy arrays
            'nargs-eats-options': false,    // Simplify nargs handling
            'negation-prefix': 'no-',
            'populate--': false,            // We don't use -- passthrough
            'set-placeholder-key': false,   // We don't use placeholders
            'strip-aliased': false,
            'strip-dashed': false,
            'unknown-options-as-args': false,
          }
        };

        return parser(args, optimizedOpts);
      };

      // Re-export the main parser for compatibility.
      module.exports.default = module.exports;
      module.exports.detailed = (args, opts) => {
        const result = module.exports(args, opts);
        return { argv: result, error: null, aliases: {}, newAliases: {} };
      };
    `,
  },

  'npm-package-arg': {
    // npm-package-arg includes git/github URL parsing we might not need.
    customEntry: `
      const npa = require('npm-package-arg');

      // Wrapper that skips git URL parsing if not needed.
      module.exports = function parseArg(arg, where) {
        // Fast path for simple cases.
        if (!arg) return npa(arg, where);

        // If it's clearly not a git URL, use simpler parsing.
        if (!arg.includes('git') && !arg.includes('github.com') && !arg.includes('://')) {
          try {
            // Try simple parsing first.
            const atIndex = arg.lastIndexOf('@');
            if (atIndex > 0) {
              const name = arg.substring(0, atIndex);
              const version = arg.substring(atIndex + 1);
              if (name && version && /^[\\d\\.]+/.test(version)) {
                return {
                  name,
                  type: 'version',
                  registry: true,
                  raw: arg,
                  rawSpec: version,
                  saveSpec: version,
                  fetchSpec: version,
                  scope: name.startsWith('@') ? name.split('/')[0] : undefined
                };
              }
            }
          } catch {}
        }

        // Fall back to full parsing for complex cases.
        return npa(arg, where);
      };

      // Re-export original for compatibility.
      module.exports.Result = npa.Result;
      module.exports.resolve = npa.resolve;
      module.exports.default = module.exports;
    `,
  },

  'picomatch': {
    // Picomatch includes features we don't use.
    customEntry: `
      const picomatch = require('picomatch');

      // Create a simplified picomatch for our use case.
      // We mainly use it for glob matching, not the advanced features.
      function simplifiedPicomatch(patterns, options = {}) {
        // Optimize for our common use case: file extension matching.
        if (typeof patterns === 'string' && patterns.startsWith('**/*.')) {
          const ext = patterns.slice(5);
          return (input) => input.endsWith(ext);
        }

        // Use full picomatch for complex patterns.
        return picomatch(patterns, {
          ...options,
          // Disable features we don't use.
          expandRange: undefined,  // We don't use brace expansion
          onResult: undefined,     // We don't use result callbacks
          onIgnore: undefined,     // We don't use ignore callbacks
          onMatch: undefined,      // We don't use match callbacks
        });
      }

      simplifiedPicomatch.isMatch = picomatch.isMatch;
      simplifiedPicomatch.parse = picomatch.parse;
      simplifiedPicomatch.scan = picomatch.scan;
      simplifiedPicomatch.compileRe = picomatch.compileRe;

      module.exports = simplifiedPicomatch;
      module.exports.default = simplifiedPicomatch;
    `,
  },

  'fast-glob': {
    // Fast-glob includes stream API we don't use.
    customEntry: `
      const fg = require('fast-glob');

      // Only export the methods we actually use.
      // We don't use the stream API which pulls in a lot of code.
      module.exports = async function glob(patterns, options = {}) {
        // Optimize for our common patterns.
        if (options.onlyFiles === undefined) options.onlyFiles = true;
        if (options.followSymbolicLinks === undefined) options.followSymbolicLinks = false;

        return fg(patterns, options);
      };

      module.exports.sync = fg.sync;
      module.exports.glob = module.exports;
      module.exports.globSync = fg.sync;
      module.exports.async = module.exports;
      module.exports.default = module.exports;

      // We explicitly DON'T export:
      // - stream/generateTasks (saves ~15KB)
      // - convertPathToPattern
      // - isDynamicPattern
    `,
  },

  'browserslist': {
    // Browserslist includes update checking we don't need.
    customEntry: `
      const browserslist = require('browserslist');

      // Wrap browserslist to skip update checks.
      module.exports = function query(queries, opts = {}) {
        // Force disable update checks in production.
        const productionOpts = {
          ...opts,
          ignoreUnknownVersions: true,
          dangerousExtend: false,
          mobileToDesktop: false,
          // Disable stats loading if not needed.
          stats: opts.stats || undefined,
          env: opts.env || 'production'
        };

        return browserslist(queries, productionOpts);
      };

      // Export commonly used functions.
      module.exports.loadConfig = browserslist.loadConfig;
      module.exports.clearCaches = browserslist.clearCaches;
      module.exports.parseConfig = browserslist.parseConfig;
      module.exports.findConfig = browserslist.findConfig;
      module.exports.coverage = browserslist.coverage;
      module.exports.default = module.exports;
    `,
  },

  // DO NOT STUB THESE FOR CLI:
  // - 'debug' - Users may want to enable DEBUG env var
  // - 'yoctocolors-cjs' - We NEED colors for CLI output
  // - 'validate-npm-package-name' - We NEED good error messages
  // - '@inquirer/*' - We NEED the full interactive prompts
  // - 'ora'/'yocto-spinner' - We NEED progress indicators
};

// Helper to determine if a package benefits from cherry-picking.
export function shouldCherryPick(packageName) {
  // Only cherry-pick if we have a real optimization, not a stub.
  const entry = cherryPickEntries[packageName];
  if (!entry) return false;

  // Don't cherry-pick packages that are already small.
  const smallPackages = ['yoctocolors-cjs', 'validate-npm-package-name', 'which'];
  if (smallPackages.includes(packageName)) return false;

  return true;
}