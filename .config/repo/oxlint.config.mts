/**
 * @file Repo overlay over the fleet oxlint config. socket-registry's
 *   `packages/npm/**` tree holds zero-dependency reimplementations of real npm
 *   packages that must stay faithful to upstream behavior — some return `null`
 *   by design, none take a logger dependency, and their public API signatures
 *   mirror the package they reimplement. A handful of fleet code rules can't be
 *   satisfied there without changing that observable behavior or adding a
 *   dependency, so they're turned off for `packages/npm/**` only. Everything
 *   else (including the prototype-pollution `options-null-proto` guard, which
 *   is behavior-safe on internal options reads) stays enforced. This is a
 *   REPO-SPECIFIC concern — it lives in `.config/repo/` (auto- discovered by
 *   the fleet lint runner, which prefers a repo overlay over the fleet
 *   canonical), NOT in the cascaded fleet config. The factory import gives the
 *   fully-resolved fleet config; the `overrides` block is appended after the
 *   fleet overrides, with globs matched from the repo root.
 */

import { defineConfig } from 'oxlint'

import { config } from '../fleet/oxlint.config.mts'

// oxlint-disable-next-line socket/no-default-export -- oxlint loads the config from this module's default export.
export default defineConfig(
  config({
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
          // Reimplementations mirror upstream file layout; don't force a split.
          'socket/max-file-lines': 'off',
        },
      },
    ],
  }),
)
