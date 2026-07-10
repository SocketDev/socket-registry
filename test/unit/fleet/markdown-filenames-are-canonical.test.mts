// Unit tests for the markdown-filename canonical check
// (scripts/fleet/check/markdown-filenames-are-canonical.mts). Exercises the pure
// findViolations against synthetic paths (classifyMarkdownPath inspects the path
// string only, so no real files are needed).
import { describe, expect, it } from 'vitest'

import { findViolations } from '../../../scripts/fleet/check/markdown-filenames-are-canonical.mts'

const ROOT = '/repo'

describe('findViolations', () => {
  it('flags a mixed-case doc filename', () => {
    const v = findViolations(['docs/MyDoc.md'], ROOT)
    expect(v.map(x => x.file)).toStrictEqual(['docs/MyDoc.md'])
  })

  it('allows lowercase-with-hyphens + README anywhere', () => {
    // README is allowlisted at any depth; lowercase-hyphens is always fine.
    // (Root-only allowlist names like CHANGELOG need the real repo root for the
    // hook's root-detection — covered by the hook's own test, not here.)
    expect(
      findViolations(
        ['docs/my-doc.md', 'README.md', 'docs/a/b/nested-doc.md'],
        ROOT,
      ),
    ).toStrictEqual([])
  })

  it('ignores non-markdown + .claude tree', () => {
    expect(
      findViolations(['src/Foo.ts', '.claude/skills/Some_Thing.md'], ROOT),
    ).toStrictEqual([])
  })

  it('flags a SCREAMING_CASE name not on the allowlist', () => {
    const v = findViolations(['FOO.md'], ROOT)
    expect(v.length).toBe(1)
  })

  it('allows a source-mirroring stem with underscores (code-file hint)', () => {
    // `version_subset.js.md` documents `version_subset.js` — the stem quotes
    // the source filename verbatim, so its underscores are fine.
    expect(
      findViolations(
        ['docs/additions/lib/internal/http/version_subset.js.md'],
        ROOT,
      ),
    ).toStrictEqual([])
  })

  it('still flags underscores without a code-file hint', () => {
    const v = findViolations(['docs/foo_bar.md'], ROOT)
    expect(v.map(x => x.file)).toStrictEqual(['docs/foo_bar.md'])
  })

  it('ignores vendored-source payload trees', () => {
    // Names/locations inside vendored source payloads are upstream-dictated.
    expect(
      findViolations(
        [
          'packages/node-smol-builder/additions/source-patched/doc/api/smol-vfs.md',
          'packages/foo/upstream/Docs_Weird.md',
          'vendor/lib/API_NOTES.md',
        ],
        ROOT,
      ),
    ).toStrictEqual([])
  })
})
