/**
 * @file Exports-surface config for @socketsecurity/registry. The package's
 *   exports map is hand-maintained (three real entries + JSON data files);
 *   this config exists for the `public-files-are-exported` validator, which
 *   reads `ignore` to learn which built files are internal.
 *   `dist/manifest.js` is the rolldown-preserved module for `manifest.json`
 *   that `dist/index.js` requires internally — its module shape is a lazy
 *   CommonJS factory, not the manifest data, so it must never be a public
 *   entry. Consumers read the data through the `./manifest.json` export.
 */

import type { ExportsConfig } from '../../../scripts/fleet/make-package-exports.mts'

export const config: ExportsConfig = {
  ignore: ['dist/manifest.js'],
  outDir: 'dist',
}
