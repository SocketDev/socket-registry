/**
 * @file The RESOLUTION LADDER for one allowed-action grant on npm's
 *   trusted-publisher form — pure, so every page shape the writer tolerates is
 *   unit-testable from an invented control inventory, with no browser.
 *   This module exists because a live sweep refused with "the allowPublish
 *   control is a hidden input encoding 'on' and no checkbox is rendered to flip
 *   it to false". The writer at the time knew ONE shape, a checkbox, and read
 *   anything else as a page-shape change. npm has never documented this form,
 *   so knowing one shape is the bug: the fix is to resolve a grant control
 *   across every shape the platform plausibly renders, in a fixed priority
 *   order, and to fail LOUD with what it actually found when none match.
 *   The order is the wire contract first and prose last. A control matched by
 *   its `name` is matched on the identifier npm submits; a control matched by
 *   its `value` carrying a grant token (`npm publish`, `createPackageVersion`)
 *   is matched on an identifier too, one rung softer because a chip list can
 *   reuse a value; a control matched by its LABEL is matched on copy, which is
 *   restyled and reworded far more often than either. Within a matched set,
 *   a native checkbox beats a radio pair beats a select beats an ARIA
 *   `role="switch"` beats a hidden input, because that is the order from "the
 *   browser owns the state" to "a script owns the state".
 *   A hidden input is a terminal rung on purpose. In the classic HTML idiom a
 *   hidden input carries the OFF value and a checkbox beside it carries ON, so
 *   a hidden encoding "on" with NO checkbox is NOT that idiom — it means the
 *   control is rendered somewhere this capture did not look, or that npm does
 *   not offer the toggle for this account or package at all. Neither is
 *   something to guess at by rewriting the hidden input's value: that would
 *   submit a state no rendered control ever offered, and the run would report
 *   success for a change npm may never have accepted.
 */

import {
  collectFormDomControls,
  normalizeControlToken,
  readFormDomAttribute,
} from './configure-staged-publishing-form-dom.mts'

import type {
  FormDomNode,
  FormDomSnapshot,
} from './configure-staged-publishing-form-dom.mts'

/**
 * One candidate control, flattened out of a captured form region into the facts
 * the ladder decides on. Values are RAW here — the ladder compares against
 * them; every printing path redacts.
 */
export interface ActionControlCandidate {
  ariaChecked: string | undefined
  ariaLabel: string | undefined
  checked: boolean | undefined
  disabled: boolean
  /**
   * The element's position in the page's own control query. This is how the
   * writer re-locates the exact element the ladder chose.
   */
  index: number
  labelText: string | undefined
  name: string | undefined
  optionValues: readonly string[] | undefined
  rendered: boolean
  role: string | undefined
  tag: string
  text: string | undefined
  type: string | undefined
  value: string | undefined
}

/**
 * How a candidate was matched to the wanted grant, weakest last.
 */
export type ActionControlMatch = 'label' | 'name' | 'value-token'

/**
 * What the writer should do with the control the ladder picked.
 *
 * `noop` is a resolution, not a failure: a page already reporting the wanted
 * state has nothing to set, and clicking it anyway would flip it away.
 */
export type ActionControlPlan =
  | {
      force: boolean
      how: 'checkbox'
      index: number
      via: ActionControlMatch
    }
  | { how: 'noop'; reason: string }
  | { force: boolean; how: 'radio'; index: number; via: ActionControlMatch }
  | { how: 'select'; index: number; option: string; via: ActionControlMatch }
  | { how: 'toggle'; index: number; via: ActionControlMatch }
  | { how: 'unresolved'; reason: string }

/**
 * One grant the writer wants set, named every way the ladder can match it.
 */
export interface ActionControlRequest {
  /**
   * Grant tokens npm uses for this action anywhere it identifies it by value —
   * the form spelling (`npm publish`) and the payload spelling
   * (`createPackageVersion`) both belong here.
   */
  actionTokens: readonly string[]
  checked: boolean
  label: RegExp
  name: string
}

const ON_TOKENS: ReadonlySet<string> = new Set([
  '1',
  'allow',
  'allowed',
  'checked',
  'enabled',
  'on',
  'selected',
  'true',
  'yes',
])

const OFF_TOKENS: ReadonlySet<string> = new Set([
  '0',
  'denied',
  'deny',
  'disabled',
  'false',
  'no',
  'off',
  'unchecked',
])

/**
 * The boolean a control value encodes, or `undefined` when nothing about it
 * says which state it means.
 *
 * `undefined` is a real answer and the caller must not collapse it to `false`.
 * An empty value in particular is genuinely ambiguous — some forms use it as
 * the off value and some leave it empty until a script fills it — and guessing
 * wrong means either skipping a grant that is still live or reporting a change
 * that never happened.
 */
export function encodesActionState(
  value: string | undefined,
): boolean | undefined {
  if (value === undefined) {
    return undefined
  }
  const token = value.trim().toLowerCase()
  if (ON_TOKENS.has(token)) {
    return true
  }
  if (OFF_TOKENS.has(token)) {
    return false
  }
  return undefined
}

/**
 * Flatten a captured form region into ladder candidates, in document order.
 */
export function collectActionControlCandidates(
  snapshot: FormDomSnapshot,
): ActionControlCandidate[] {
  const nodes = collectFormDomControls(snapshot)
  const candidates: ActionControlCandidate[] = []
  for (let i = 0, { length } = nodes; i < length; i += 1) {
    const node = nodes[i]!
    if (node.controlIndex === undefined) {
      continue
    }
    candidates.push(toActionControlCandidate(node, node.controlIndex))
  }
  return candidates
}

function toActionControlCandidate(
  node: FormDomNode,
  index: number,
): ActionControlCandidate {
  const disabledAttr = readFormDomAttribute(node, 'disabled')
  const ariaDisabled = readFormDomAttribute(node, 'aria-disabled')
  const optionValues = node.options?.map(option => option.value)
  return {
    ariaChecked: readFormDomAttribute(node, 'aria-checked'),
    ariaLabel: readFormDomAttribute(node, 'aria-label'),
    checked: node.checked,
    disabled: disabledAttr !== undefined || ariaDisabled === 'true',
    index,
    labelText: node.labelText,
    name: readFormDomAttribute(node, 'name'),
    optionValues,
    rendered: node.rendered,
    role: readFormDomAttribute(node, 'role')?.toLowerCase(),
    tag: node.tag.toLowerCase(),
    text: node.text,
    type: readFormDomAttribute(node, 'type')?.toLowerCase(),
    value: readFormDomAttribute(node, 'value') ?? node.propertyValue,
  }
}

function matchesName(
  candidate: ActionControlCandidate,
  request: ActionControlRequest,
): boolean {
  return (
    candidate.name !== undefined &&
    normalizeControlToken(candidate.name) ===
      normalizeControlToken(request.name)
  )
}

function matchesValueToken(
  candidate: ActionControlCandidate,
  request: ActionControlRequest,
): boolean {
  const { value } = candidate
  if (value === undefined || value === '') {
    return false
  }
  const normalized = normalizeControlToken(value)
  const { actionTokens } = request
  for (let i = 0, { length } = actionTokens; i < length; i += 1) {
    if (normalizeControlToken(actionTokens[i]!) === normalized) {
      return true
    }
  }
  return false
}

function matchesLabel(
  candidate: ActionControlCandidate,
  request: ActionControlRequest,
): boolean {
  const texts = [candidate.labelText, candidate.ariaLabel, candidate.text]
  for (let i = 0, { length } = texts; i < length; i += 1) {
    const text = texts[i]
    // A fresh lastIndex every test: a /g or /y label pattern would otherwise
    // skip matches depending on what it matched last.
    request.label.lastIndex = 0
    if (text !== undefined && request.label.test(text)) {
      return true
    }
  }
  return false
}

function isToggleRole(candidate: ActionControlCandidate): boolean {
  return (
    candidate.role === 'checkbox' ||
    candidate.role === 'radio' ||
    candidate.role === 'switch'
  )
}

// Prefer a control the operator can actually see. A rendered control is the one
// npm expects a person to use; a present-but-styled-away one still works, but
// only with a forced interaction, so it is the fallback rather than the pick.
function preferRendered(
  candidates: readonly ActionControlCandidate[],
): ActionControlCandidate | undefined {
  for (let i = 0, { length } = candidates; i < length; i += 1) {
    const candidate = candidates[i]!
    if (candidate.rendered) {
      return candidate
    }
  }
  return candidates[0]
}

function filter(
  candidates: readonly ActionControlCandidate[],
  predicate: (candidate: ActionControlCandidate) => boolean,
): ActionControlCandidate[] {
  const kept: ActionControlCandidate[] = []
  for (let i = 0, { length } = candidates; i < length; i += 1) {
    const candidate = candidates[i]!
    if (predicate(candidate)) {
      kept.push(candidate)
    }
  }
  return kept
}

// The STATE ladder: every rung here is a control whose own state says whether
// the grant is on, so setting it to `checked` is the whole operation.
function resolveStateControl(
  all: readonly ActionControlCandidate[],
  request: ActionControlRequest,
  via: ActionControlMatch,
): ActionControlPlan | undefined {
  // A disabled control is not a control this run can set. Dropping it here is
  // what lets the failure say "every control matching this grant is disabled",
  // which is a different fix from "npm renders no control at all".
  const candidates = filter(all, c => !c.disabled)
  const checkbox = preferRendered(
    filter(candidates, c => c.tag === 'input' && c.type === 'checkbox'),
  )
  if (checkbox) {
    return {
      force: !checkbox.rendered,
      how: 'checkbox',
      index: checkbox.index,
      via,
    }
  }
  const radios = filter(
    candidates,
    c => c.tag === 'input' && c.type === 'radio',
  )
  if (radios.length) {
    const wanted = preferRendered(
      filter(radios, c => encodesActionState(c.value) === request.checked),
    )
    if (wanted) {
      return { force: !wanted.rendered, how: 'radio', index: wanted.index, via }
    }
  }
  const select = preferRendered(filter(candidates, c => c.tag === 'select'))
  if (select?.optionValues) {
    const { optionValues } = select
    for (let i = 0, { length } = optionValues; i < length; i += 1) {
      const option = optionValues[i]!
      if (encodesActionState(option) === request.checked) {
        return { how: 'select', index: select.index, option, via }
      }
    }
  }
  const toggle = preferRendered(
    filter(candidates, c => c.tag !== 'input' && isToggleRole(c)),
  )
  if (toggle) {
    const state = encodesActionState(toggle.ariaChecked)
    if (state === request.checked) {
      return {
        how: 'noop',
        reason: `the ${toggle.role} control already reports aria-checked=${JSON.stringify(toggle.ariaChecked ?? '')}`,
      }
    }
    if (state !== undefined) {
      return { how: 'toggle', index: toggle.index, via }
    }
  }
  const hidden = filter(
    candidates,
    c => c.tag === 'input' && c.type === 'hidden',
  )[0]
  if (hidden && encodesActionState(hidden.value) === request.checked) {
    return {
      how: 'noop',
      reason: `the only ${request.name} control is a hidden input already encoding ${JSON.stringify(hidden.value ?? '')}`,
    }
  }
  return undefined
}

// The TOKEN ladder: the control identifies the grant by its VALUE, so the grant
// is on when the control is checked. A radio in this shape can only ever GRANT,
// because picking it selects the action it names. That makes it usable when the
// wanted state is true and useless when it is false, and saying so is better
// than checking a sibling nobody asked for.
function resolveTokenControl(
  all: readonly ActionControlCandidate[],
  request: ActionControlRequest,
): ActionControlPlan | undefined {
  const candidates = filter(all, c => !c.disabled)
  const checkbox = preferRendered(
    filter(candidates, c => c.tag === 'input' && c.type === 'checkbox'),
  )
  if (checkbox) {
    return {
      force: !checkbox.rendered,
      how: 'checkbox',
      index: checkbox.index,
      via: 'value-token',
    }
  }
  const toggle = preferRendered(
    filter(candidates, c => c.tag !== 'input' && isToggleRole(c)),
  )
  if (toggle) {
    const state = encodesActionState(toggle.ariaChecked)
    if (state === request.checked) {
      return {
        how: 'noop',
        reason: `the ${toggle.role} control carrying this grant token already reports aria-checked=${JSON.stringify(toggle.ariaChecked ?? '')}`,
      }
    }
    if (state !== undefined) {
      return { how: 'toggle', index: toggle.index, via: 'value-token' }
    }
  }
  if (request.checked) {
    const radio = preferRendered(
      filter(candidates, c => c.tag === 'input' && c.type === 'radio'),
    )
    if (radio) {
      return {
        force: !radio.rendered,
        how: 'radio',
        index: radio.index,
        via: 'value-token',
      }
    }
  }
  return undefined
}

/**
 * Resolve ONE grant to a control to drive, or to a loud `unresolved`.
 *
 * Match priority is name → grant token → label; within each match, the shape
 * priority is checkbox → radio → select → ARIA toggle → hidden. Nothing here
 * writes and nothing here guesses: a shape the ladder does not recognize
 * resolves to `unresolved`, whose reason the caller renders alongside every
 * candidate it did find.
 */
export function resolveActionControlPlan(
  candidates: readonly ActionControlCandidate[],
  request: ActionControlRequest,
): ActionControlPlan {
  const byName = filter(candidates, c => matchesName(c, request))
  const named = resolveStateControl(byName, request, 'name')
  if (named) {
    return named
  }
  const byToken = filter(candidates, c => matchesValueToken(c, request))
  const tokened = resolveTokenControl(byToken, request)
  if (tokened) {
    return tokened
  }
  const byLabel = filter(
    candidates,
    c => !matchesName(c, request) && matchesLabel(c, request),
  )
  const labeled = resolveStateControl(byLabel, request, 'label')
  if (labeled) {
    return labeled
  }
  return {
    how: 'unresolved',
    reason: describeUnresolvedReason(byName, byToken, byLabel, request),
  }
}

function describeUnresolvedReason(
  byName: readonly ActionControlCandidate[],
  byToken: readonly ActionControlCandidate[],
  byLabel: readonly ActionControlCandidate[],
  request: ActionControlRequest,
): string {
  const matched = byName.length + byToken.length + byLabel.length
  if (!matched) {
    return `no control on the form carries the name "${request.name}", a value naming this grant, or a label matching ${String(request.label)}`
  }
  const hiddenOnly =
    byName.length > 0 &&
    byName.every(c => c.tag === 'input' && c.type === 'hidden')
  if (hiddenOnly) {
    const hidden = byName[0]!
    const encoded = encodesActionState(hidden.value)
    // The classic HTML idiom pairs a hidden input carrying the OFF value with a
    // checkbox carrying ON. A hidden carrying ON with no checkbox is therefore
    // not that idiom, and the two readings it leaves are worth naming because
    // they need opposite fixes.
    return (
      `the only "${request.name}" control is a hidden input encoding ` +
      `${JSON.stringify(hidden.value ?? '')}${
        encoded === undefined ? ' (a value that does not say on or off)' : ''
      }, and no checkbox, radio, select, or role="switch" control is rendered ` +
      `to set it to ${request.checked}. In the usual hidden+checkbox idiom the ` +
      'hidden carries the OFF value, so this is either a control rendered ' +
      'outside the captured region or a grant npm does not offer to change for ' +
      'this account or package'
    )
  }
  const disabledOnly = [...byName, ...byToken, ...byLabel].every(
    c => c.disabled,
  )
  if (disabledOnly) {
    return `every control matching "${request.name}" is disabled, so the form offers no way to set this grant to ${request.checked}`
  }
  return `${matched} control(s) matched "${request.name}" but none is a checkbox, radio pair, select, or role="switch" this run knows how to set to ${request.checked}`
}
