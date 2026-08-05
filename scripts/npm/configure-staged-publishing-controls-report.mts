/**
 * @file How an unresolved allowed-action grant is REPORTED — the failure block
 *   the writer throws when the resolution ladder in
 *   `./configure-staged-publishing-controls.mts` finds no control it can set.
 *   Reporting is split from resolving because it has a different obligation.
 *   The ladder decides; this renders, and it renders on a FAILURE path, which
 *   is exactly where output ends up in a terminal and in a transcript. So every
 *   candidate it names goes through the same redaction the form dump uses: a
 *   value prints only when it is a short enum token, and anything else is a
 *   length. The candidate list IS the re-derivation. The next person does not
 *   have to reproduce the page to know what npm rendered, and the `--dump-form`
 *   lane the Fix line names prints the same inventory on demand without
 *   touching a single control.
 */

import { encodesActionState } from './configure-staged-publishing-controls.mts'
import { redactUiText } from './configure-staged-publishing-form-dom.mts'

import type {
  ActionControlCandidate,
  ActionControlRequest,
} from './configure-staged-publishing-controls.mts'

/**
 * One candidate as a redacted line, for the failure block. Same redaction rules
 * as the form dump — this prints on a failure path, which is exactly where a
 * raw value would end up in a transcript.
 */
export function describeActionControlCandidate(
  candidate: ActionControlCandidate,
): string {
  const parts = [`control#${candidate.index}`, candidate.tag]
  if (candidate.type !== undefined) {
    parts.push(`type=${JSON.stringify(candidate.type)}`)
  }
  if (candidate.role !== undefined) {
    parts.push(`role=${JSON.stringify(candidate.role)}`)
  }
  if (candidate.name !== undefined) {
    parts.push(`name=${JSON.stringify(candidate.name)}`)
  }
  if (candidate.value !== undefined) {
    const state = encodesActionState(candidate.value)
    parts.push(
      `value=${
        state === undefined
          ? `string(len=${candidate.value.length})`
          : JSON.stringify(candidate.value)
      }`,
    )
  }
  if (candidate.ariaChecked !== undefined) {
    parts.push(`aria-checked=${JSON.stringify(candidate.ariaChecked)}`)
  }
  if (candidate.checked !== undefined) {
    parts.push(`checked=${candidate.checked}`)
  }
  if (candidate.optionValues) {
    parts.push(`options=${candidate.optionValues.length}`)
  }
  if (candidate.disabled) {
    parts.push('[disabled]')
  }
  parts.push(candidate.rendered ? '[rendered]' : '[not-rendered]')
  const label = candidate.labelText ?? candidate.ariaLabel
  if (label !== undefined) {
    parts.push(`label=${redactUiText(label)}`)
  }
  return parts.join(' ')
}

/**
 * Failure block for a grant the ladder could not resolve, in
 * What / Where / Saw vs wanted / Fix order.
 *
 * Every candidate the capture found prints, redacted. That list IS the
 * re-derivation: the next person does not have to reproduce the page to know
 * what it rendered, and the `--dump-form` lane named in the Fix line prints the
 * same inventory on demand without touching a single control.
 */
export function formatUnresolvedActionControl(config: {
  action: string
  candidates: readonly ActionControlCandidate[]
  packageName: string
  reason: string
  request: ActionControlRequest
  url: string
}): string {
  const cfg = { __proto__: null, ...config } as typeof config
  const lines: string[] = []
  for (let i = 0, { length } = cfg.candidates; i < length; i += 1) {
    lines.push(`  - ${describeActionControlCandidate(cfg.candidates[i]!)}`)
  }
  const inventory = lines.length
    ? `\nControls the capture found:\n${lines.join('\n')}`
    : '\nThe capture found no form controls at all.'
  return [
    `What: ${cfg.packageName}'s "${cfg.action}" grant could not be set to ${cfg.request.checked}, so the form was not saved and nothing changed.`,
    `Where: ${cfg.url}`,
    `Saw: ${cfg.reason}.${inventory}`,
    `Wanted: a checkbox, radio pair, select, or role="switch" control this run can set "${cfg.request.name}" to ${cfg.request.checked} with.`,
    `Fix: run \`pnpm run npm:configure-staged --dump-form ${cfg.packageName}\` in the signed-in Chrome window to print the form's redacted DOM, then add the shape it reports to the ladder in scripts/npm/configure-staged-publishing-controls.mts. Do not hand-edit the hidden input's value — a state no rendered control offers is a state npm may refuse while the run reports success.`,
  ].join('\n')
}
