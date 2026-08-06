/**
 * @file Tests for how an unresolved allowed-action grant is REPORTED, and for
 *   the step before it: flattening a captured form region into the candidates
 *   the ladder decides on.
 *   The load-bearing property is redaction. This block prints on a FAILURE
 *   path, which is exactly where output lands in a terminal and in a
 *   transcript, so a candidate value that is not a short enum token must come
 *   out as a length. The four-ingredient order is asserted too: a failure that
 *   does not say What, Where, Saw, and Fix leaves the next person to reproduce
 *   the page by hand.
 */

import { describe, expect, test } from 'vitest'

import {
  describeActionControlCandidate,
  formatUnresolvedActionControl,
} from '../../../scripts/repo/npm/configure-staged-publishing-controls-report.mts'
import { collectActionControlCandidates } from '../../../scripts/repo/npm/configure-staged-publishing-controls.mts'

import type { ActionControlCandidate } from '../../../scripts/repo/npm/configure-staged-publishing-controls.mts'
import type {
  FormDomNode,
  FormDomSnapshot,
} from '../../../scripts/repo/npm/configure-staged-publishing-form-dom.mts'

const CLEAR_DIRECT = {
  actionTokens: ['npm publish', 'createPackage', 'publish'],
  checked: false,
  label: /allow npm publish/i,
  name: 'allowPublish',
}

function candidate(
  config: Partial<ActionControlCandidate> & { index: number; tag: string },
): ActionControlCandidate {
  return {
    ariaChecked: undefined,
    ariaLabel: undefined,
    checked: undefined,
    disabled: false,
    labelText: undefined,
    name: undefined,
    optionValues: undefined,
    rendered: true,
    role: undefined,
    text: undefined,
    type: undefined,
    value: undefined,
    ...config,
  }
}
describe('formatUnresolvedActionControl', () => {
  const candidates = [
    candidate({
      index: 4,
      labelText: 'Allow npm publish',
      name: 'allowPublish',
      rendered: false,
      tag: 'input',
      type: 'hidden',
      value: 'on',
    }),
    candidate({
      index: 9,
      name: 'csrftoken',
      tag: 'input',
      type: 'hidden',
      value: 'invented-csrf-token-value',
    }),
  ]

  const block = formatUnresolvedActionControl({
    action: 'npm publish',
    candidates,
    packageName: '@socketregistry/abab',
    reason: 'the only "allowPublish" control is a hidden input encoding "on"',
    request: CLEAR_DIRECT,
    url: 'https://www.npmjs.com/package/@socketregistry/abab/access',
  })

  test('carries all four ingredients in order', () => {
    const at = (label: string) => block.indexOf(label)
    expect(at('What:')).toBe(0)
    expect(at('Where:')).toBeGreaterThan(at('What:'))
    expect(at('Saw:')).toBeGreaterThan(at('Where:'))
    expect(at('Wanted:')).toBeGreaterThan(at('Saw:'))
    expect(at('Fix:')).toBeGreaterThan(at('Wanted:'))
  })

  test('names every candidate the capture found', () => {
    expect(block).toContain('control#4 input type="hidden" name="allowPublish"')
    expect(block).toContain('value="on"')
    expect(block).toContain('control#9')
  })

  test('points at the dump lane rather than at a hand-edit', () => {
    expect(block).toContain('--dump-form @socketregistry/abab')
    expect(block).toContain('Do not hand-edit the hidden input')
  })

  test('leaks no raw value into the failure it prints', () => {
    expect(block).not.toContain('invented-csrf-token-value')
    expect(block).toContain('value=string(len=25)')
  })
})

describe('collectActionControlCandidates', () => {
  function node(config: Partial<FormDomNode> & { tag: string }): FormDomNode {
    return {
      attributes: [],
      checked: undefined,
      children: [],
      controlIndex: undefined,
      labelText: undefined,
      options: undefined,
      propertyValue: undefined,
      rendered: true,
      text: undefined,
      ...config,
    }
  }

  test('flattens a captured region into ladder candidates in document order', () => {
    const captured: FormDomSnapshot = {
      pageUrl: 'https://www.npmjs.com/package/@socketregistry/abab/access',
      rootStrategy: 'the ancestor of input[name="workflowName"]',
      roots: [
        node({
          children: [
            node({
              attributes: [
                { name: 'name', value: 'allowPublish' },
                { name: 'type', value: 'hidden' },
                { name: 'value', value: 'on' },
              ],
              controlIndex: 4,
              rendered: false,
              tag: 'input',
            }),
            node({
              attributes: [
                { name: 'role', value: 'switch' },
                { name: 'aria-checked', value: 'false' },
                { name: 'aria-disabled', value: 'true' },
              ],
              controlIndex: 1,
              labelText: 'Allow npm stage publish',
              tag: 'button',
            }),
          ],
          tag: 'form',
        }),
      ],
      truncated: false,
    }
    const flattened = collectActionControlCandidates(captured)
    expect(flattened.map(c => c.index)).toEqual([1, 4])
    expect(flattened[0]).toMatchObject({
      ariaChecked: 'false',
      disabled: true,
      labelText: 'Allow npm stage publish',
      role: 'switch',
      tag: 'button',
    })
    expect(flattened[1]).toMatchObject({
      name: 'allowPublish',
      rendered: false,
      type: 'hidden',
      value: 'on',
    })
  })

  test('describes a candidate without printing an unrecognized value', () => {
    expect(
      describeActionControlCandidate(
        candidate({
          index: 2,
          tag: 'input',
          type: 'text',
          value: 'socket-registry',
        }),
      ),
    ).toContain('value=string(len=15)')
  })
})
