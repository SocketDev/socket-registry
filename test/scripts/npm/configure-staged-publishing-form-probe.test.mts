import { runInNewContext } from 'node:vm'

import { expect, test } from 'vitest'

import {
  collectFormDomSnapshot,
  FORM_CONTROL_SELECTOR,
} from '../../../scripts/repo/npm/configure-staged-publishing-form-probe.mts'

import type { Page } from 'playwright-core'

// oxlint-disable-next-line socket/prefer-undefined-over-null -- DOM APIs return null for absent nodes and views.
const absentDomValue = null

type SnapshotOptions = Parameters<typeof collectFormDomSnapshot>[1]

function createElement(tagName: string, children: object[] = []) {
  return {
    __proto__: null,
    attributes: [],
    children,
    closest: () => absentDomValue,
    contains: (other: object) => children.includes(other),
    getAttribute: () => absentDomValue,
    getClientRects: () => [{}],
    ownerDocument: { defaultView: absentDomValue },
    parentElement: absentDomValue,
    tagName,
    textContent: '  fixture   text  ',
  }
}

async function collectFixture(
  root: object,
  controls: object[] = [],
  options?: SnapshotOptions,
) {
  const document = {
    body: root,
    getElementById: () => absentDomValue,
    querySelector: (selector: string) =>
      selector === 'main' ? root : absentDomValue,
    querySelectorAll: (selector: string) =>
      selector === FORM_CONTROL_SELECTOR ? controls : [],
  }
  const page = {
    evaluate: async (callback: (args: unknown) => unknown, args: unknown) =>
      runInNewContext(`(${callback.toString()})(args)`, {
        args,
        document,
        window: { location: { href: 'https://example.invalid/form' } },
      }),
  } as unknown as Page
  return await collectFormDomSnapshot(page, options)
}

test('serializes selected options in DOM read order and caps labels', async () => {
  const reads: string[] = []
  const option = {
    get label() {
      reads.push('label')
      return 'release workflow'
    },
    get selected() {
      reads.push('selected')
      return true
    },
    get value() {
      reads.push('option value')
      return 'release.yml'
    },
  }
  const field = {
    ...createElement('SELECT'),
    get type() {
      reads.push('type')
      return 'select-one'
    },
    get options() {
      reads.push('options')
      return [option]
    },
    get children() {
      reads.push('children')
      return []
    },
    get value() {
      reads.push('field value')
      return 'release.yml'
    },
  }
  const snapshot = await collectFixture(field, [field], { maxText: 7 })
  expect(reads).toEqual([
    'type',
    'options',
    'options',
    'label',
    'selected',
    'option value',
    'children',
    'field value',
  ])
  expect(snapshot.roots[0]).toMatchObject({
    controlIndex: 0,
    options: [{ label: 'release', selected: true, value: 'release.yml' }],
    propertyValue: 'release.yml',
    rendered: true,
    tag: 'select',
    text: 'fixture',
  })
})

test('stops before reading descendants beyond the depth budget', async () => {
  const child = {
    get tagName(): string {
      throw new Error('depth budget exceeded')
    },
  }
  const snapshot = await collectFixture(createElement('MAIN', [child]), [], {
    maxDepth: 1,
  })
  expect(snapshot.truncated).toBe(true)
  expect(snapshot.roots[0]).toMatchObject({ children: [], text: undefined })
})

test('preserves named-control text and stops at the node budget', async () => {
  const skipped = {
    get tagName(): string {
      throw new Error('node budget exceeded')
    },
  }
  const label = createElement('LABEL', [createElement('SPAN'), skipped])
  const snapshot = await collectFixture(label, [], { maxNodes: 2 })
  expect(snapshot.truncated).toBe(true)
  expect(snapshot.roots[0]?.text).toBe('fixture text')
  expect(snapshot.roots[0]?.children).toHaveLength(1)
  expect(snapshot.roots[0]?.children[0]?.text).toBe('fixture text')
})
