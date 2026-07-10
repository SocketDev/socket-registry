// vitest specs for patching-findings/lib/patch-parse — the five-tag patch
// extraction, the reviewer trailing-block parse, the style-contradiction FLAG
// (which never alters the verdict), and the Phase-5 tally + PATCHES.md render.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  parsePatchResult,
  parseReviewResult,
  renderPatchesMd,
  summarizeOutcomes,
  unescapeEntities,
} from '../../../scripts/fleet/patching-findings/lib/patch-parse.mts'
import type { PatchOutcome } from '../../../scripts/fleet/patching-findings/lib/patch-parse.mts'

describe('unescapeEntities', () => {
  test('decodes the three entities the prompt tolerates', () => {
    assert.equal(unescapeEntities('a &lt;b&gt; &amp; c'), 'a <b> & c')
  })
})

describe('parsePatchResult', () => {
  test('extracts five tags + unescapes the diff', () => {
    const p = parsePatchResult(
      '<patch_diff>--- a/x\n+++ b/x\n+fix &lt;tag&gt;</patch_diff>' +
        '<rationale>fixes it</rationale>' +
        '<variants_checked>none</variants_checked>' +
        '<bypass_considered>tried</bypass_considered>' +
        '<test_note>added</test_note>',
    )
    assert.equal(p.status, 'patched')
    assert.ok(p.patch_diff.includes('<tag>'))
    assert.equal(p.rationale, 'fixes it')
    assert.equal(p.test_note, 'added')
  })
  test('NONE / empty diff → no_patch', () => {
    assert.equal(
      parsePatchResult('<patch_diff>NONE</patch_diff><rationale>fp</rationale>')
        .status,
      'no_patch',
    )
    assert.equal(
      parsePatchResult('<patch_diff></patch_diff>').status,
      'no_patch',
    )
  })
})

describe('parseReviewResult', () => {
  test('takes the verdict verbatim + parses the trailing block', () => {
    const r = parseReviewResult(
      'prose\nREVIEW: ACCEPT\nSTYLE_SCORE: 8\nOUT_OF_SCOPE_HUNKS: none\nREASON: minimal and targeted.\n',
    )
    assert.equal(r.review, 'ACCEPT')
    assert.equal(r.style_score, 8)
    assert.deepEqual(r.out_of_scope_hunks, [])
    assert.equal(r.style_contradiction, false)
  })
  test('style < 5 under ACCEPT FLAGS a contradiction but keeps the verdict', () => {
    const r = parseReviewResult(
      'REVIEW: ACCEPT\nSTYLE_SCORE: 3\nOUT_OF_SCOPE_HUNKS: a.c:5, b.c:9\nREASON: noisy.',
    )
    // The verdict is UNCHANGED — the flag never downgrades the reviewer's call.
    assert.equal(r.review, 'ACCEPT')
    assert.equal(r.style_contradiction, true)
    assert.deepEqual(r.out_of_scope_hunks, ['a.c:5', 'b.c:9'])
  })
  test('a low style under REJECT is not a contradiction', () => {
    assert.equal(
      parseReviewResult(
        'REVIEW: REJECT\nSTYLE_SCORE: 2\nOUT_OF_SCOPE_HUNKS: none\nREASON: x',
      ).style_contradiction,
      false,
    )
  })
})

describe('summarizeOutcomes + renderPatchesMd', () => {
  const outcomes: PatchOutcome[] = [
    {
      applied: true,
      commit_sha: 'abc',
      file: 'x',
      id: 'f1',
      line: 1,
      rationale: 'r',
      review: 'ACCEPT',
      severity: 'HIGH',
      status: 'patched',
      title: 'the fix',
      variants_checked: 'v',
    },
    {
      applied: false,
      id: 'f2',
      review: 'REJECT',
      review_reason: 'noisy',
      status: 'patched',
      title: 'rejected one',
    },
    {
      applied: false,
      id: 'f3',
      skip_reason: 'fp',
      status: 'no_patch',
      title: 'skipped one',
    },
  ]

  test('counts applied / rejected / skipped', () => {
    assert.deepEqual(summarizeOutcomes(outcomes), {
      applied: 1,
      rejected: 1,
      skipped: 1,
      total: 3,
    })
  })

  test('renders the three sections', () => {
    const md = renderPatchesMd({
      findingsPath: 'V.json',
      outcomes,
      repo: '.',
    })
    assert.ok(md.includes('1 applied, 1 rejected, 1 skipped'))
    assert.ok(md.includes('commit abc'))
    assert.ok(md.includes('f2 rejected one — noisy'))
    assert.ok(md.includes('f3 skipped one — fp'))
  })
})
