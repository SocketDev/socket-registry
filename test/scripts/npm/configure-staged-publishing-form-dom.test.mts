/**
 * @file Tests for the `--dump-form` diagnostic's pure renderer. The
 *   load-bearing property is the same one the payload dump has: REDACTION. npm
 *   renders the signed-in account's name, its email, and maintainer names into
 *   attribute values and element text, so a string escaping into the output is
 *   a credential leak rather than a formatting bug — and this renderer prints
 *   on a FAILURE path, which is exactly where output ends up in a transcript.
 *   Every fixture here is invented. The shapes come from what npm plausibly
 *   renders for an allowed-action control, including the one a live run met on
 *   `@socketregistry/abab`: a hidden `allowPublish` input encoding "on" with no
 *   checkbox beside it.
 */

import { describe, expect, test } from 'vitest'

import {
  collectFormDomControls,
  describeClassAttribute,
  describeFormDomNode,
  describeFormDomTree,
  isSafeUiText,
  normalizeControlToken,
  readFormDomAttribute,
  redactAttributeValue,
  redactUiText,
  summarizeFormDomControls,
} from '../../../scripts/npm/configure-staged-publishing-form-dom.mts'

import type {
  FormDomNode,
  FormDomSnapshot,
} from '../../../scripts/npm/configure-staged-publishing-form-dom.mts'

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

function snapshot(roots: FormDomNode[]): FormDomSnapshot {
  return {
    pageUrl: 'https://www.npmjs.com/package/@socketregistry/abab/access',
    rootStrategy: 'the ancestor of input[name="workflowName"]',
    roots,
    truncated: false,
  }
}

// The shape the refusal described: a hidden input carrying the grant, with no
// checkbox rendered beside it.
const HIDDEN_ALLOW_PUBLISH = node({
  attributes: [
    { name: 'name', value: 'allowPublish' },
    { name: 'type', value: 'hidden' },
    { name: 'value', value: 'on' },
  ],
  controlIndex: 4,
  rendered: false,
  tag: 'input',
})

describe('redactAttributeValue', () => {
  test('prints a short enum value in full, which is what makes a hidden input legible', () => {
    expect(redactAttributeValue('value', 'on')).toBe('"on"')
    expect(redactAttributeValue('value', 'off')).toBe('"off"')
    expect(redactAttributeValue('aria-checked', 'true')).toBe('"true"')
    expect(redactAttributeValue('aria-checked', 'false')).toBe('"false"')
  })

  test('prints wire-contract attributes, because they are npm identifiers', () => {
    expect(redactAttributeValue('name', 'allowPublish')).toBe('"allowPublish"')
    expect(redactAttributeValue('type', 'checkbox')).toBe('"checkbox"')
    expect(redactAttributeValue('role', 'switch')).toBe('"switch"')
  })

  test('redacts a value that is neither an enum nor wire contract', () => {
    expect(redactAttributeValue('value', 'socket-registry')).toBe(
      'string(len=15)',
    )
    expect(redactAttributeValue('href', 'https://example.test/a')).toBe(
      'string(len=22)',
    )
  })

  test('redacts every data-* value and keeps only the name', () => {
    expect(redactAttributeValue('data-testid', 'on')).toBe('string(len=2)')
    expect(
      redactAttributeValue('data-user-email', 'someone@example.test'),
    ).toBe('string(len=20)')
  })

  test('prints npm form copy and redacts anything else in a label', () => {
    expect(redactAttributeValue('aria-label', 'Allow npm publish')).toBe(
      '"Allow npm publish"',
    )
    expect(redactAttributeValue('aria-label', 'someone@example.test')).toBe(
      'string(len=20)',
    )
  })
})

describe('isSafeUiText and redactUiText', () => {
  test('npm form vocabulary plus filler words is safe', () => {
    expect(isSafeUiText('Allow npm stage publish')).toBe(true)
    expect(isSafeUiText('Allow this workflow to publish the package')).toBe(
      true,
    )
  })

  test('one unknown word redacts the whole string', () => {
    expect(isSafeUiText('Allow npm publish for socketregistry')).toBe(false)
    expect(redactUiText('Allow npm publish for socketregistry')).toBe(
      'string(len=36)',
    )
  })

  test('empty and over-long copy is redacted rather than printed', () => {
    expect(redactUiText('   ')).toBe('string(len=3)')
    expect(redactUiText('publish '.repeat(40))).toContain('string(len=')
  })

  test('collapses whitespace before printing so two captures compare', () => {
    expect(redactUiText('  Allow   npm\n publish ')).toBe('"Allow npm publish"')
  })
})

describe('describeClassAttribute', () => {
  test('keeps the tokens that describe the control and counts the rest', () => {
    expect(describeClassAttribute('sr-only checkbox _f1a2b3 theme-dark')).toBe(
      'class(sr-only checkbox +2 more)',
    )
  })

  test('reports a class list with nothing diagnostic in it as a count only', () => {
    expect(describeClassAttribute('_f1a2b3 _c4d5e6')).toBe('class(— +2 more)')
  })
})

describe('describeFormDomNode', () => {
  test('renders the hidden-input shape the live refusal met', () => {
    const line = describeFormDomNode(HIDDEN_ALLOW_PUBLISH)
    expect(line).toContain('input')
    expect(line).toContain('name="allowPublish"')
    expect(line).toContain('type="hidden"')
    expect(line).toContain('value="on"')
    expect(line).toContain('control#4')
    expect(line).toContain('[not-rendered]')
  })

  test('reports the live checked property, which can disagree with the attribute', () => {
    const line = describeFormDomNode(
      node({
        attributes: [
          { name: 'name', value: 'allowStagePublish' },
          { name: 'type', value: 'checkbox' },
          { name: 'checked', value: '' },
        ],
        checked: false,
        controlIndex: 5,
        tag: 'input',
      }),
    )
    expect(line).toContain('checked=false')
    expect(line).toContain('[rendered]')
  })

  test('reports a select enum by its option values', () => {
    const line = describeFormDomNode(
      node({
        attributes: [{ name: 'name', value: 'allowPublish' }],
        controlIndex: 2,
        options: [
          { label: 'Allowed', selected: false, value: 'on' },
          { label: 'Not allowed', selected: true, value: 'off' },
        ],
        tag: 'select',
      }),
    )
    expect(line).toContain('options=["on", "off"*]')
  })

  test('leaks neither an account email nor a page token', () => {
    const line = describeFormDomNode(
      node({
        attributes: [
          { name: 'name', value: 'csrftoken' },
          { name: 'type', value: 'hidden' },
          { name: 'value', value: 'invented-csrf-token-value' },
          { name: 'data-owner', value: 'someone@example.test' },
        ],
        labelText: 'Signed in as someone@example.test',
        tag: 'input',
      }),
    )
    expect(line).not.toContain('invented-csrf-token-value')
    expect(line).not.toContain('someone@example.test')
    expect(line).toContain('value=string(len=25)')
    expect(line).toContain('data-owner=string(len=20)')
    expect(line).toContain('label=string(len=33)')
  })
})

describe('describeFormDomTree', () => {
  test('names the region strategy and indents the children', () => {
    const lines = describeFormDomTree(
      snapshot([
        node({
          children: [HIDDEN_ALLOW_PUBLISH],
          tag: 'form',
        }),
      ]),
    )
    expect(lines[0]).toContain('the ancestor of input[name="workflowName"]')
    expect(lines[0]).toContain('(1 root(s))')
    expect(lines[1]).toBe('  form [rendered]')
    expect(lines[2]).toContain('    input')
  })

  test('stops at the depth limit rather than recursing forever', () => {
    const deep = node({
      children: [
        node({
          children: [node({ children: [node({ tag: 'span' })], tag: 'div' })],
          tag: 'div',
        }),
      ],
      tag: 'form',
    })
    const lines = describeFormDomTree(snapshot([deep]), { maxDepth: 3 }).join(
      '\n',
    )
    expect(lines).toContain('depth limit')
    expect(lines).not.toContain('span')
  })

  test('stops at the node limit and says so', () => {
    const wide = node({
      children: Array.from({ length: 10 }, () => node({ tag: 'div' })),
      tag: 'form',
    })
    const lines = describeFormDomTree(snapshot([wide]), { maxNodes: 4 }).join(
      '\n',
    )
    expect(lines).toContain('…(node limit)')
  })

  test('reports a capture that hit its own cap as incomplete', () => {
    const lines = describeFormDomTree({
      ...snapshot([node({ tag: 'form' })]),
      truncated: true,
    })
    expect(lines.join('\n')).toContain('the capture itself hit its node cap')
  })
})

describe('collectFormDomControls and summarizeFormDomControls', () => {
  const region = snapshot([
    node({
      children: [
        node({
          attributes: [
            { name: 'name', value: 'workflowName' },
            { name: 'type', value: 'text' },
          ],
          controlIndex: 0,
          tag: 'input',
        }),
        node({
          attributes: [
            { name: 'role', value: 'switch' },
            { name: 'aria-checked', value: 'true' },
          ],
          controlIndex: 1,
          tag: 'button',
        }),
        HIDDEN_ALLOW_PUBLISH,
      ],
      tag: 'form',
    }),
  ])

  test('collects every indexed control in document order', () => {
    expect(collectFormDomControls(region).map(c => c.controlIndex)).toEqual([
      0, 1, 4,
    ])
  })

  test('groups toggles, hidden inputs, and everything else', () => {
    const lines = summarizeFormDomControls(region).join('\n')
    expect(lines).toContain('role="switch"): 1')
    expect(lines).toContain('Hidden inputs: 1')
    expect(lines).toContain('Other controls (text inputs, buttons): 1')
    expect(lines).toContain('name="allowPublish"')
  })

  test('says so plainly when a group is empty', () => {
    expect(summarizeFormDomControls(snapshot([node({ tag: 'form' })]))).toEqual(
      [
        'Toggle-shaped controls (checkbox / radio / select / role="switch"): 0',
        '  (none)',
        'Hidden inputs: 0',
        '  (none)',
        'Other controls (text inputs, buttons): 0',
        '  (none)',
      ],
    )
  })
})

describe('readFormDomAttribute and normalizeControlToken', () => {
  test('reads an attribute case-insensitively and raw', () => {
    expect(readFormDomAttribute(HIDDEN_ALLOW_PUBLISH, 'NAME')).toBe(
      'allowPublish',
    )
    expect(readFormDomAttribute(HIDDEN_ALLOW_PUBLISH, 'missing')).toBe(
      undefined,
    )
  })

  test('normalizes a camel, kebab, snake, and spaced spelling to one token', () => {
    expect(normalizeControlToken('allowPublish')).toBe('allowpublish')
    expect(normalizeControlToken('allow-publish')).toBe('allowpublish')
    expect(normalizeControlToken('allow_publish')).toBe('allowpublish')
    expect(normalizeControlToken('npm stage publish')).toBe('npmstagepublish')
  })
})
