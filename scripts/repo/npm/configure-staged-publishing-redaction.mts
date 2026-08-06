/**
 * @file The REDACTION policy the form re-derivation prints through — pure
 *   tables and five small functions, so what may appear in a terminal or a
 *   transcript is decided in one place and tested on its own.
 *   The access page carries the signed-in account name, its email, maintainer
 *   names, and the page CSRF token, and any of those can sit in an attribute
 *   value or an element's text. So a value prints in full only when it is
 *   provably none of them: a short enum token such as `on`, `true`, or
 *   `false`; a structural attribute that is part of the wire contract such as
 *   `name`, `type`, `role`, or `aria-checked`; or UI copy whose every word is
 *   in npm's own form vocabulary. Everything else prints as `string(len=N)`,
 *   and a `data-*` value never prints at all — the NAME is the diagnostic and
 *   the value is npm's private state.
 *   The vocabulary gate is deliberately strict. One word outside npm's form
 *   copy redacts the whole string, so "Allow npm publish" stays legible while
 *   "Signed in as someone@example.test" does not. A redacted label still tells
 *   the operator a label EXISTS and how long it is, which is all a shape
 *   re-derivation needs.
 */

// Values that cannot carry a credential or identify an account, so they print
// in full. This is the "short enum-ish" allowance: it is what makes a hidden
// input's `value="on"` legible, which is the whole reason this lane exists.
const SAFE_ENUM_VALUES: ReadonlySet<string> = new Set([
  '0',
  '1',
  'allow',
  'button',
  'checkbox',
  'checked',
  'combobox',
  'deny',
  'disabled',
  'enabled',
  'false',
  'form',
  'group',
  'hidden',
  'mixed',
  'no',
  'none',
  'off',
  'on',
  'presentation',
  'radio',
  'reset',
  'submit',
  'switch',
  'text',
  'true',
  'unchecked',
  'yes',
])

// Attributes that are wire contract rather than content: a form field's name,
// its type, its ARIA state. npm's own identifiers, never an account's data.
const STRUCTURAL_ATTRIBUTES: ReadonlySet<string> = new Set([
  'aria-checked',
  'aria-disabled',
  'aria-expanded',
  'aria-hidden',
  'aria-pressed',
  'aria-readonly',
  'aria-required',
  'autocomplete',
  'checked',
  'disabled',
  'for',
  'hidden',
  'id',
  'inputmode',
  'method',
  'multiple',
  'name',
  'readonly',
  'required',
  'role',
  'selected',
  'tabindex',
  'type',
])

// Attributes holding VISIBLE COPY. Their values go through the vocabulary gate
// rather than printing outright, because npm renders account and package names
// into labels and titles.
const UI_TEXT_ATTRIBUTES: ReadonlySet<string> = new Set([
  'alt',
  'aria-label',
  'aria-roledescription',
  'label',
  'placeholder',
  'title',
])

// npm's own trusted-publisher form vocabulary. A piece of UI copy prints in
// full only when EVERY word in it is in here or in the filler list below, which
// is what keeps "Allow npm publish" legible while an account name, an email, or
// a repository slug is redacted by the same rule that would have printed it.
const FORM_VOCABULARY_WORDS: ReadonlySet<string> = new Set([
  'access',
  'action',
  'actions',
  'add',
  'allow',
  'allowed',
  'automation',
  'cancel',
  'change',
  'changes',
  'classic',
  'configure',
  'connect',
  'connection',
  'delete',
  'disable',
  'disabled',
  'edit',
  'enable',
  'enabled',
  'environment',
  'factor',
  'filename',
  'github',
  'granular',
  'name',
  'no',
  'npm',
  'off',
  'on',
  'optional',
  'organization',
  'owner',
  'package',
  'permission',
  'permissions',
  'provenance',
  'publish',
  'publisher',
  'publishers',
  'publishing',
  'remove',
  'repositories',
  'repository',
  'required',
  'save',
  'set',
  'stage',
  'staged',
  'token',
  'trusted',
  'two',
  'up',
  'update',
  'user',
  'workflow',
  'yes',
])

// Words that carry no information about an account, so they never turn a piece
// of otherwise-safe UI copy into a redaction.
const FILLER_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'and',
  'are',
  'at',
  'be',
  'by',
  'can',
  'for',
  'from',
  'in',
  'is',
  'it',
  'its',
  'of',
  'or',
  'that',
  'the',
  'this',
  'to',
  'when',
  'will',
  'with',
  'you',
  'your',
])

// Class tokens worth printing because they describe the CONTROL, not the theme.
// A `sr-only` on a checkbox is the difference between "npm removed the control"
// and "npm styled it away behind a label", which is a different fix entirely.
const SAFE_CLASS_TOKENS: ReadonlySet<string> = new Set([
  'checkbox',
  'checked',
  'disabled',
  'hidden',
  'invisible',
  'radio',
  'screenreader',
  'screenreaderonly',
  'sronly',
  'switch',
  'toggle',
  'unchecked',
  'visuallyhidden',
])

const MAX_ENUM_VALUE_LENGTH = 16
const MAX_STRUCTURAL_VALUE_LENGTH = 64
const MAX_UI_TEXT_LENGTH = 120

/**
 * A string reduced to its letters and digits, lowercased, so a
 * camel / kebab / snake / spaced spelling of the same token compares equal.
 */
export function normalizeControlToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Whether a piece of UI copy is safe to print in full.
 *
 * Every word must be npm's own form vocabulary or a filler word. One unknown
 * word — an account name, a repository slug, an email local part — redacts the
 * whole string, which is the conservative direction: a redacted label still
 * tells the operator a label EXISTS and how long it is.
 */
export function isSafeUiText(value: string): boolean {
  const collapsed = value.trim().replace(/\s+/g, ' ')
  if (!collapsed || collapsed.length > MAX_UI_TEXT_LENGTH) {
    return false
  }
  const words = collapsed.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) ?? []
  if (!words.length) {
    return false
  }
  for (let i = 0, { length } = words; i < length; i += 1) {
    const word = words[i]!
    if (!FORM_VOCABULARY_WORDS.has(word) && !FILLER_WORDS.has(word)) {
      return false
    }
  }
  return true
}

/**
 * A piece of visible copy, printed only when {@link isSafeUiText} clears it.
 */
export function redactUiText(value: string): string {
  const collapsed = value.trim().replace(/\s+/g, ' ')
  return isSafeUiText(value)
    ? JSON.stringify(collapsed)
    : `string(len=${value.length})`
}

/**
 * A `class` attribute reduced to the tokens that describe the control, plus a
 * count of everything else. Theme classes are noise and can carry a build hash;
 * `sr-only` is a finding.
 */
export function describeClassAttribute(value: string): string {
  const tokens = value.trim().split(/\s+/).filter(Boolean)
  const kept: string[] = []
  for (let i = 0, { length } = tokens; i < length; i += 1) {
    const token = tokens[i]!
    if (SAFE_CLASS_TOKENS.has(normalizeControlToken(token))) {
      kept.push(token)
    }
  }
  const rest = tokens.length - kept.length
  const shown = kept.length ? kept.join(' ') : '—'
  return `class(${shown}${rest ? ` +${rest} more` : ''})`
}

/**
 * One attribute value, redacted by what the attribute IS.
 *
 * The order is the policy: a short enum token prints wherever it appears (that
 * is what makes `value="on"` readable), then the wire-contract attributes,
 * then visible copy through the vocabulary gate, and everything left over is a
 * length. `data-*` never prints its value at all — the name is the diagnostic.
 */
export function redactAttributeValue(name: string, value: string): string {
  const lower = name.toLowerCase()
  if (lower.startsWith('data-')) {
    return `string(len=${value.length})`
  }
  if (lower === 'class') {
    return describeClassAttribute(value)
  }
  const token = value.trim().toLowerCase()
  if (value.length <= MAX_ENUM_VALUE_LENGTH && SAFE_ENUM_VALUES.has(token)) {
    return JSON.stringify(value)
  }
  if (
    STRUCTURAL_ATTRIBUTES.has(lower) &&
    value.length <= MAX_STRUCTURAL_VALUE_LENGTH
  ) {
    return JSON.stringify(value)
  }
  if (UI_TEXT_ATTRIBUTES.has(lower)) {
    return redactUiText(value)
  }
  return `string(len=${value.length})`
}

/**
 * A live DOM property value, printed only when it is a short enum token.
 *
 * A property is not an attribute and carries no wire-contract allowance: the
 * only thing worth reading off one is whether it says on or off, so anything
 * else is a length.
 */
export function redactEnumOrLength(value: string): string {
  const token = value.trim().toLowerCase()
  return value.length <= MAX_ENUM_VALUE_LENGTH && SAFE_ENUM_VALUES.has(token)
    ? JSON.stringify(value)
    : `string(len=${value.length})`
}
