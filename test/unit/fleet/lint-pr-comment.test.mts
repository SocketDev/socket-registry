import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  lintPrReviewComment,
  stripCodeFences,
} from '../../../scripts/fleet/lint-pr-comment.mts'

const RED = '<abbr title="Critical: fix before merge/run">🔴</abbr>'
const ORANGE = '<abbr title="Significant: should be addressed">🟠</abbr>'
const YELLOW = '<abbr title="Moderate/minor: worth addressing">🟡</abbr>'
const GREEN = '<abbr title="Verified fine / informational">🟢</abbr>'

function section(options: {
  anchor?: string | undefined
  body?: string | undefined
  circle: string
  title: string
}): string {
  const opts = { __proto__: null, ...options }
  const anchor = opts.anchor ? `<a name="${opts.anchor}"></a>` : ''
  return [
    '<details>',
    `<summary>${anchor}${opts.circle} <b>${opts.title}</b></summary>`,
    '<blockquote>',
    '',
    opts.body ?? 'Body text.',
    '',
    '</blockquote>',
    '</details>',
  ].join('\n')
}

// A smaller-items-style fold with blockquote-wrapped body lines.
function fold(summaryCircle: string, bodyLines: string[]): string {
  return [
    '<details>',
    `<summary>${summaryCircle} <b>Smaller items</b></summary>`,
    '<blockquote>',
    '',
    ...bodyLines,
    '',
    '</blockquote>',
    '</details>',
  ].join('\n')
}

test('a conformant comment produces no violations', () => {
  const body = [
    'Intro sentence.',
    '',
    section({ circle: RED, title: '1. Big bug' }),
    '',
    section({ circle: ORANGE, title: '2. Real gap' }),
    '',
    fold(YELLOW, [
      `- ${YELLOW} A duplicated query worth collapsing.`,
      `- ${GREEN} A theoretical case-folding nit.`,
    ]),
    '',
    'Closing: item 1 _(big bug)_ first. Fix idea 💡: do the thing.',
  ].join('\n')
  assert.deepEqual(lintPrReviewComment(body), [])
})

test('a summary without abbr-wrapped circle fails summary-shape', () => {
  const body = '<details>\n<summary>🟡 <b>Title</b></summary>\n\nx\n</details>'
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.ok(rules.includes('summary-shape'))
})

test('a wrong hover label fails hover-label', () => {
  const body = section({
    circle: '<abbr title="wrong">🟢</abbr>',
    title: 'Fine',
  })
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.deepEqual(rules, ['hover-label'])
})

test('sections out of severity order fail severity-order', () => {
  const body = [
    section({ circle: GREEN, title: 'Fine' }),
    section({ circle: RED, title: 'Bad' }),
  ].join('\n')
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.ok(rules.includes('severity-order'))
})

test('non-sequential numbered titles fail sequential-numbering', () => {
  const body = [
    section({ circle: RED, title: '1. First' }),
    section({ circle: ORANGE, title: '3. Skipped two' }),
  ].join('\n')
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.deepEqual(rules, ['sequential-numbering'])
})

test('Fix idea without the bulb fails fix-idea-bulb', () => {
  const rules = lintPrReviewComment('Fix idea: do it.').map(v => v.rule)
  assert.deepEqual(rules, ['fix-idea-bulb'])
})

test('a bare numeric reference fails titled-reference', () => {
  const rules = lintPrReviewComment('See item 2 for details.').map(v => v.rule)
  assert.deepEqual(rules, ['titled-reference'])
})

test('titled references pass in plain and comma-italic forms', () => {
  const body = [
    'See item 2 _(pre-handler blindness)_ and finding 1, _threshold_.',
    section({ circle: YELLOW, title: '1. Reducer' }),
  ].join('\n')
  assert.deepEqual(lintPrReviewComment(body), [])
})

test('a smaller-items bullet without its own circle fails bullet-circle', () => {
  const body = fold(YELLOW, ['- A bullet with no circle.'])
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.deepEqual(rules, ['bullet-circle'])
})

test('a critical smaller-items bullet fails no-critical-smaller-item', () => {
  const body = fold(RED, [`- ${RED} This should be its own section.`])
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.ok(rules.includes('no-critical-smaller-item'))
})

test('a fold circle milder than its worst bullet fails fold-circle-matches-bullets', () => {
  const body = fold(GREEN, [`- ${YELLOW} A yellow bullet under a green fold.`])
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.deepEqual(rules, ['fold-circle-matches-bullets'])
})

test('a fragment link fails no-anchor-links', () => {
  const rules = lintPrReviewComment(
    'See [item 1](#user-content-finding-1) _(title)_.',
  ).map(v => v.rule)
  assert.deepEqual(rules, ['no-anchor-links'])
})

test('AI attribution fails no-ai-attribution', () => {
  const rules = lintPrReviewComment('Co-Authored-By: Claude <x@y>').map(
    v => v.rule,
  )
  assert.deepEqual(rules, ['no-ai-attribution'])
})

test('an unknown circle emoji fails severity-circle', () => {
  const body = section({
    circle: '<abbr title="whatever">🔵</abbr>',
    title: 'Blue is not a severity',
  })
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.deepEqual(rules, ['severity-circle'])
})

test('a smaller-items bullet with a wrong hover label fails hover-label', () => {
  const body = fold(YELLOW, [
    '- <abbr title="wrong">🟡</abbr> Mislabeled bullet.',
  ])
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.deepEqual(rules, ['hover-label'])
})

test('every bare reference on a line is flagged, one violation each', () => {
  const violations = lintPrReviewComment('Compare item 2 with finding 3.')
  assert.deepEqual(
    violations.map(v => v.rule),
    ['titled-reference', 'titled-reference'],
  )
})

test('numbered summary titles are exempt from titled-reference', () => {
  const body = section({ circle: RED, title: '1. Finding 1 lives here' })
  assert.deepEqual(lintPrReviewComment(body), [])
})

test('an empty smaller-items fold reports nothing about its circle', () => {
  const body = fold(GREEN, ['No bullets, only prose.'])
  assert.deepEqual(lintPrReviewComment(body), [])
})

test('a fold circle matching its worst bullet passes', () => {
  const body = fold(ORANGE, [
    `- ${ORANGE} The worst bullet.`,
    `- ${GREEN} A fine one.`,
  ])
  assert.deepEqual(lintPrReviewComment(body), [])
})

test('equal-severity neighbors do not trip severity-order', () => {
  const body = [
    section({ circle: YELLOW, title: '1. First yellow' }),
    section({ circle: YELLOW, title: '2. Second yellow' }),
    section({ circle: GREEN, title: 'All clear' }),
  ].join('\n')
  assert.deepEqual(lintPrReviewComment(body), [])
})

test('violations come back sorted by line number', () => {
  const body = [
    'See item 9 alone.',
    section({ circle: GREEN, title: 'Fine' }),
    section({ circle: RED, title: 'Out of order' }),
    'Fix idea: no bulb.',
  ].join('\n')
  const violations = lintPrReviewComment(body)
  const lines = violations.map(v => v.line)
  assert.deepEqual(
    lines,
    [...lines].toSorted((a, b) => a - b),
  )
  assert.deepEqual(
    violations.map(v => v.rule).toSorted(),
    ['fix-idea-bulb', 'severity-order', 'titled-reference'].toSorted(),
  )
})

test('code fences are blanked with line count preserved', () => {
  const body = 'a\n```\nFix idea: inside a fence\n```\nb'
  const stripped = stripCodeFences(body)
  assert.equal(stripped.split('\n').length, body.split('\n').length)
  assert.deepEqual(lintPrReviewComment(body), [])
})

test('an <a name> anchor in a summary fails no-anchor-links', () => {
  const body = section({
    anchor: 'finding-1',
    circle: RED,
    title: '1. Big bug',
  })
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.deepEqual(rules, ['no-anchor-links'])
})

test('a details body without a blockquote wrapper fails details-body-blockquote', () => {
  const body = [
    '<details>',
    `<summary>${RED} <b>1. Bug</b></summary>`,
    '',
    'Unindented body text.',
    '</details>',
  ].join('\n')
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.deepEqual(rules, [
    'details-body-blockquote',
    'details-body-blockquote',
  ])
})

test('a blockquote opened but not closed before </details> is flagged once', () => {
  const body = [
    '<details>',
    `<summary>${RED} <b>1. Bug</b></summary>`,
    '<blockquote>',
    '',
    'Body text.',
    '</details>',
  ].join('\n')
  const rules = lintPrReviewComment(body).map(v => v.rule)
  assert.deepEqual(rules, ['details-body-blockquote'])
})
