/**
 * @file The dev-vs-prod scope classification for CHANGELOG entries. A
 *   commit's scope selects which half of the release notes it renders under:
 *   a scope naming internal fleet tooling (hooks, cascade, CI, lint/check
 *   gates, the bootstrap/dispatch machinery, generated bundles, dep/config
 *   plumbing) lands under the version's `### Internal` subsection instead of
 *   the consumer-facing Added/Changed/Fixed. A consumer scope (`cli`, `api`,
 *   `sdk`, a shipped feature) or no scope at all is prod — internal tooling
 *   has to name itself here to opt IN, a shipped feature never has to opt
 *   out.
 */

export const DEV_SCOPES: ReadonlySet<string> = new Set([
  'bootstrap',
  'bundle',
  'cascade',
  'check',
  'ci',
  'config',
  'deps',
  'dispatch',
  'fleet',
  'gitignore',
  'hooks',
  'lint',
  'wheelhouse',
])

export const changelogInternalScope = 'Internal'

export function isChangelogDevScope(scope: string | undefined): boolean {
  return scope !== undefined && DEV_SCOPES.has(scope)
}
