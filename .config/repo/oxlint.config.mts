/**
 * @file Repo overlay over the fleet oxlint config. socket-registry's
 *   `packages/npm/**` tree holds zero-dependency reimplementations of real npm
 *   packages that must stay faithful to upstream behavior — some return `null`
 *   by design, none take a logger dependency, their public API signatures
 *   mirror the package they reimplement, and they export only what upstream
 *   exports. A handful of fleet code rules can't be satisfied there without
 *   changing that observable behavior, widening the public API surface, or
 *   adding a dependency, so they're turned off for `packages/npm/**` only. The
 *   parity tests under `test/npm/**` exercise that upstream behavior directly,
 *   so they pass `null` literals on purpose and get the same null-rule
 *   exemption. Everything else (including the prototype-pollution
 *   `options-null-proto` guard, which is behavior-safe on internal options
 *   reads, and the whole sort-* family, which is layout-only) stays enforced.
 *   This is a REPO-SPECIFIC concern — it lives in `.config/repo/` (auto-
 *   discovered by the fleet lint runner, which prefers a repo overlay over the
 *   fleet canonical), NOT in the cascaded fleet config. The factory import
 *   gives the fully-resolved fleet config; the `overrides` block is appended
 *   after the fleet overrides, with globs matched from the repo root.
 */

import { defineConfig } from 'oxlint'

import { config } from '../fleet/oxlint.config.mts'

// oxlint-disable-next-line socket/no-default-export -- oxlint loads the config from this module's default export.
export default defineConfig(
  config({
    // Type-aware rules (the `--type-aware` tsgolint lane the fleet lint
    // runner's whole-tree gate turned on) are staged OFF here: first
    // enforcement surfaced 400+ pre-existing findings across the vendored
    // packages/npm reimplementations (upstream `var $m = Proto.method`
    // idiom trips unbound-method by design) and repo scripts/tests.
    // Burn the debt down rule-by-rule, deleting entries here as each rule
    // reaches zero findings — the fleet lint-modernization campaign owns
    // the sweep.
    rules: {
      'typescript/await-thenable': 'off',
      'typescript/consistent-return': 'off',
      'typescript/no-array-delete': 'off',
      'typescript/no-base-to-string': 'off',
      'typescript/no-duplicate-type-constituents': 'off',
      'typescript/no-floating-promises': 'off',
      'typescript/no-implied-eval': 'off',
      'typescript/no-redundant-type-constituents': 'off',
      // Errors (not just no-ops) under registry/'s strictNullChecks: false.
      'typescript/no-unnecessary-boolean-literal-compare': 'off',
      'typescript/no-unnecessary-template-expression': 'off',
      'typescript/no-unnecessary-type-assertion': 'off',
      'typescript/no-unnecessary-type-conversion': 'off',
      'typescript/no-unsafe-type-assertion': 'off',
      'typescript/no-useless-default-assignment': 'off',
      'typescript/require-array-sort-compare': 'off',
      'typescript/restrict-template-expressions': 'off',
      'typescript/unbound-method': 'off',
    },
    overrides: [
      {
        files: ['**/packages/npm/**'],
        rules: {
          // Zero-dep reimplementations — no logger dependency to import.
          'socket/no-console-prefer-logger': 'off',
          'socket/no-inline-logger': 'off',
          'socket/no-logger-newline-literal': 'off',
          // Faithful reimplementations return `null` where upstream does;
          // a null→undefined rewrite would change observable behavior.
          'socket/prefer-undefined-over-null': 'off',
          'unicorn/no-null': 'off',
          // The public API param names mirror the reimplemented package's
          // signature; renaming opts→options would diverge from upstream.
          'socket/options-param-naming': 'off',
          // A drop-in replacement exports exactly what upstream exports;
          // force-exporting every internal helper would widen the public API
          // surface past the package being reimplemented.
          'socket/export-top-level-functions': 'off',
          // Reimplementations mirror upstream file layout; don't force a split.
          'socket/max-file-lines': 'off',
        },
      },
      {
        // Parity tests load the reimplementations and assert they treat `null`
        // exactly as upstream does (e.g. deep-equal distinguishes null from
        // undefined), so they pass `null` literals by design.
        files: ['**/test/npm/**'],
        rules: {
          'socket/prefer-undefined-over-null': 'off',
          'unicorn/no-null': 'off',
        },
      },
    ],
  }),
)
