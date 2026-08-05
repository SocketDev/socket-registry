/**
 * @file The `--dump-form` diagnostic's pure half — turn a structural snapshot
 *   of npm's trusted-publisher form into REDACTED lines, so a form whose
 *   controls changed shape can be re-derived without printing what the page
 *   contains. This is the DOM twin of `./configure-staged-publishing-dump.mts`,
 *   which does the same job for the access payload, and it exists for the same
 *   reason: the payload's key names told us where the trusted-publisher data
 *   lives, but a write is driven through CONTROLS, and a control that stops
 *   being a checkbox is invisible to a payload dump. A live run refused
 *   mid-sweep with "the allowPublish control is a hidden input encoding 'on'
 *   and no checkbox is rendered to flip it to false"; nothing in the payload
 *   lane could say what the page was rendering instead. Redaction is the point,
 *   not a courtesy. The access page carries the signed-in account's name, its
 *   email, maintainer names, and the page CSRF token, and any of those can sit
 *   in an attribute value or an element's text. So a value prints in full only
 *   when it is provably not one of those: a short enum token (`on`, `true`,
 *   `false`), a structural attribute that is part of the wire contract (`name`,
 *   `type`, `role`, `aria-checked`), or UI copy whose every word is in npm's
 *   own form vocabulary. Everything else prints as `string(len=N)`, and
 *   `data-*` values are redacted unconditionally — the NAMES are the
 *   diagnostic, the values are npm's private state. Pure — no playwright, no
 *   network — so the renderer is unit-testable from invented fixtures. The
 *   in-page collection lives in `./configure-staged-publishing-form-probe.mts`,
 *   the resolution ladder the writer drives in
 *   `./configure-staged-publishing-controls.mts`. What may be printed at all is
 *   decided in `./configure-staged-publishing-redaction.mts` and re-exported
 *   here, so a caller has one import surface for the whole dump.
 */

import {
  describeClassAttribute,
  isSafeUiText,
  normalizeControlToken,
  redactAttributeValue,
  redactEnumOrLength,
  redactUiText,
} from './configure-staged-publishing-redaction.mts'

export {
  describeClassAttribute,
  isSafeUiText,
  normalizeControlToken,
  redactAttributeValue,
  redactEnumOrLength,
  redactUiText,
}

/**
 * One attribute as the page reports it. The value arrives raw and NEVER prints
 * raw: {@link redactAttributeValue} decides what, if anything, is safe.
 */
export interface FormDomAttribute {
  name: string
  value: string
}

/**
 * One `<option>` of a `<select>`, so a select-shaped control's enum is readable
 * without printing what the options say.
 */
export interface FormDomOption {
  label: string
  selected: boolean
  value: string
}

/**
 * One element of the captured form region.
 *
 * `controlIndex` is the element's position in the page's own control query, and
 * it is what lets the writer re-locate this exact element afterwards: the
 * snapshot describes, the index points. `rendered` is the page's answer to "is
 * this on screen" — a checkbox that exists but is styled away is the classic
 * label-driven idiom, and it needs a forced click rather than a normal one.
 */
export interface FormDomNode {
  attributes: FormDomAttribute[]
  checked: boolean | undefined
  children: FormDomNode[]
  controlIndex: number | undefined
  labelText: string | undefined
  options: FormDomOption[] | undefined
  propertyValue: string | undefined
  rendered: boolean
  tag: string
  text: string | undefined
}

/**
 * One capture of the trusted-publisher form region.
 *
 * `rootStrategy` names how the region was found, because "no controls" means
 * two very different things depending on whether the collector was looking at
 * the form or at the whole page.
 */
export interface FormDomSnapshot {
  pageUrl: string
  rootStrategy: string
  roots: FormDomNode[]
  truncated: boolean
}

/**
 * Limits for one render. A page that returns a large region must not print a
 * wall the operator has to scroll past to reach the controls.
 */
export interface FormDomRenderOptions {
  maxDepth?: number | undefined
  maxNodes?: number | undefined
}

const DEFAULT_MAX_DEPTH = 12
const DEFAULT_MAX_NODES = 400

const INDENT = '  '

// Attribute print order. The wire contract goes first so the line reads as a
// control declaration rather than as whatever order the page happened to emit.
const ATTRIBUTE_PRIORITY: readonly string[] = [
  'name',
  'type',
  'role',
  'value',
  'checked',
  'disabled',
  'hidden',
  'aria-checked',
  'aria-label',
  'aria-labelledby',
  'aria-hidden',
  'aria-disabled',
  'for',
  'id',
  'class',
]

function attributeRank(name: string): number {
  const at = ATTRIBUTE_PRIORITY.indexOf(name.toLowerCase())
  return at === -1 ? ATTRIBUTE_PRIORITY.length : at
}

/**
 * One element's attributes as `name=<redacted>` parts, wire contract first and
 * the rest alphabetical, so two captures of the same page compare cleanly.
 */
export function describeFormDomAttributes(
  attributes: readonly FormDomAttribute[],
): string[] {
  const sorted = attributes.toSorted((a, b) => {
    const rank = attributeRank(a.name) - attributeRank(b.name)
    return rank === 0 ? a.name.localeCompare(b.name) : rank
  })
  const parts: string[] = []
  for (let i = 0, { length } = sorted; i < length; i += 1) {
    const attr = sorted[i]!
    parts.push(`${attr.name}=${redactAttributeValue(attr.name, attr.value)}`)
  }
  return parts
}

/**
 * One element as a single line: its tag, its redacted attributes, the live DOM
 * properties that differ from the attributes, and its flags.
 *
 * The live `checked` property matters on its own: a checkbox's `checked`
 * attribute is the page's INITIAL state, while the property is what the form
 * would submit right now, and a React-driven form routinely disagrees.
 */
export function describeFormDomNode(node: FormDomNode): string {
  const parts = [node.tag, ...describeFormDomAttributes(node.attributes)]
  if (node.checked !== undefined) {
    parts.push(`checked=${node.checked}`)
  }
  if (node.propertyValue !== undefined) {
    parts.push(`prop-value=${redactEnumOrLength(node.propertyValue)}`)
  }
  if (node.options) {
    const values: string[] = []
    for (let i = 0, { length } = node.options; i < length; i += 1) {
      const option = node.options[i]!
      values.push(
        `${redactAttributeValue('value', option.value)}${option.selected ? '*' : ''}`,
      )
    }
    parts.push(`options=[${values.join(', ')}]`)
  }
  if (node.controlIndex !== undefined) {
    parts.push(`control#${node.controlIndex}`)
  }
  parts.push(node.rendered ? '[rendered]' : '[not-rendered]')
  if (node.labelText !== undefined) {
    parts.push(`label=${redactUiText(node.labelText)}`)
  }
  if (node.text !== undefined) {
    parts.push(`text=${redactUiText(node.text)}`)
  }
  return parts.join(' ')
}

/**
 * Render a captured form region as an indented, fully redacted tree.
 *
 * Returns the lines rather than printing them, so a caller can log them, assert
 * on them in a test, or hand them to a report without a capture harness.
 */
export function describeFormDomTree(
  snapshot: FormDomSnapshot,
  options?: FormDomRenderOptions | undefined,
): string[] {
  const opts = { __proto__: null, ...options } as FormDomRenderOptions
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH
  const maxNodes = opts.maxNodes ?? DEFAULT_MAX_NODES
  const lines: string[] = [
    `region: ${snapshot.rootStrategy} (${snapshot.roots.length} root(s))`,
  ]
  if (snapshot.truncated) {
    lines.push('note: the capture itself hit its node cap and is incomplete.')
  }
  let printed = 0
  let capped = false
  const walk = (node: FormDomNode, depth: number): void => {
    if (capped) {
      return
    }
    if (printed >= maxNodes) {
      capped = true
      lines.push(`${INDENT.repeat(depth)}…(node limit)`)
      return
    }
    printed += 1
    lines.push(`${INDENT.repeat(depth)}${describeFormDomNode(node)}`)
    if (depth + 1 >= maxDepth) {
      if (node.children.length) {
        lines.push(
          `${INDENT.repeat(depth + 1)}…(depth limit, ${node.children.length} child element(s))`,
        )
      }
      return
    }
    for (let i = 0, { length } = node.children; i < length; i += 1) {
      walk(node.children[i]!, depth + 1)
    }
  }
  for (let i = 0, { length } = snapshot.roots; i < length; i += 1) {
    walk(snapshot.roots[i]!, 1)
  }
  return lines
}

/**
 * Every captured element that carries a control index, in document order.
 *
 * This is the bridge between the two lanes: the dump prints these, and the
 * writer resolves one of them to drive. Both read the same list, so a control
 * the dump shows is a control the writer considered.
 */
export function collectFormDomControls(
  snapshot: FormDomSnapshot,
): FormDomNode[] {
  const controls: FormDomNode[] = []
  const walk = (node: FormDomNode): void => {
    if (node.controlIndex !== undefined) {
      controls.push(node)
    }
    for (let i = 0, { length } = node.children; i < length; i += 1) {
      walk(node.children[i]!)
    }
  }
  for (let i = 0, { length } = snapshot.roots; i < length; i += 1) {
    walk(snapshot.roots[i]!)
  }
  return controls.toSorted(
    (a, b) => (a.controlIndex ?? 0) - (b.controlIndex ?? 0),
  )
}

/**
 * The controls a re-derivation actually looks at, grouped so the two questions
 * the refusal raised are answered on their own lines: which toggle-shaped
 * controls exist, and which hidden inputs are standing in for one.
 */
export function summarizeFormDomControls(snapshot: FormDomSnapshot): string[] {
  const controls = collectFormDomControls(snapshot)
  const toggles: FormDomNode[] = []
  const hidden: FormDomNode[] = []
  const others: FormDomNode[] = []
  for (let i = 0, { length } = controls; i < length; i += 1) {
    const node = controls[i]!
    const type = readFormDomAttribute(node, 'type')?.toLowerCase()
    const role = readFormDomAttribute(node, 'role')?.toLowerCase()
    if (type === 'hidden') {
      hidden.push(node)
    } else if (
      type === 'checkbox' ||
      type === 'radio' ||
      node.tag === 'select' ||
      role === 'switch' ||
      role === 'checkbox' ||
      role === 'radio'
    ) {
      toggles.push(node)
    } else {
      others.push(node)
    }
  }
  const lines: string[] = []
  lines.push(
    `Toggle-shaped controls (checkbox / radio / select / role="switch"): ${toggles.length}`,
  )
  pushControlLines(lines, toggles)
  lines.push(`Hidden inputs: ${hidden.length}`)
  pushControlLines(lines, hidden)
  lines.push(`Other controls (text inputs, buttons): ${others.length}`)
  pushControlLines(lines, others)
  return lines
}

function pushControlLines(
  lines: string[],
  nodes: readonly FormDomNode[],
): void {
  if (!nodes.length) {
    lines.push('  (none)')
    return
  }
  for (let i = 0, { length } = nodes; i < length; i += 1) {
    lines.push(`  ${describeFormDomNode(nodes[i]!)}`)
  }
}

/**
 * One attribute's RAW value off a captured element, or `undefined` when the
 * element does not carry it. Raw because the ladder compares against it; every
 * PRINTING path goes through {@link redactAttributeValue} instead.
 */
export function readFormDomAttribute(
  node: FormDomNode,
  name: string,
): string | undefined {
  const lower = name.toLowerCase()
  const { attributes } = node
  for (let i = 0, { length } = attributes; i < length; i += 1) {
    const attr = attributes[i]!
    if (attr.name.toLowerCase() === lower) {
      return attr.value
    }
  }
  return undefined
}
