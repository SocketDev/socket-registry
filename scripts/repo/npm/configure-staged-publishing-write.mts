/**
 * @file The WRITE half of the staged-publishing configurator, driven IN PLACE.
 *   One rule shapes every line here: after the single navigation that opened
 *   the access page, nothing in this module navigates.
 *   That rule is a bug fix, not a preference. The fleet's `driveVerifiedSave`
 *   re-navigates on every attempt and its challenge pause re-navigates again on
 *   every fresh pause, which produced an observed loop on a live run: settings
 *   page → trusted-publisher form opens → the reload CLOSES the form → the page
 *   comes back → a challenge appears → pause → reload → repeat, with
 *   "form opened via edit-button" printing once per lap. The reloads were not
 *   just undoing the work, they were CAUSING it: a rapid reload loop against
 *   npm's bot management is exactly the traffic shape that earns a real
 *   Cloudflare interstitial, so each lap made the next one more likely.
 *   So the sequence per package is open once → fill → save, uninterrupted, with
 *   no readiness re-classification in the middle that could hand control to a
 *   pause path. A genuine challenge that interrupts the fill is waited out
 *   WHERE THE PAGE IS, and the form is reopened exactly once afterwards — never
 *   by restarting the per-package loop from a navigation.
 *   The field-level locators mirror the fleet driver's (input name first,
 *   visible label as the fallback, and a hidden input that already encodes the
 *   wanted state treated as a no-op) so the two agree about the form contract
 *   even though only one of them navigates.
 */

import { MILLISECONDS_PER_SECOND } from '@socketsecurity/lib-stable/constants/time'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { sleep } from '@socketsecurity/lib-stable/promises/timers'

import type { Page } from 'playwright-core'

import { ensureFormOpen } from '../../fleet/publish-infra/npm/trusted-publisher-page.mts'

import type { TrustedPublisherDesired } from '../../fleet/publish-infra/npm/trusted-publisher-plan.mts'
import { formatUnresolvedActionControl } from './configure-staged-publishing-controls-report.mts'
import {
  collectActionControlCandidates,
  resolveActionControlPlan,
} from './configure-staged-publishing-controls.mts'
import {
  collectFormDomSnapshot,
  FORM_CONTROL_SELECTOR,
} from './configure-staged-publishing-form-probe.mts'
import {
  bindingMatchesTarget,
  DIRECT_PUBLISH_ACTION,
  grantTokensForAction,
  permitsDirectPublish,
  permitsStagedPublish,
  readTrustedPublisherState,
  STAGE_PUBLISH_ACTION,
} from './configure-staged-publishing-plan.mts'

import type { ActionControlPlan } from './configure-staged-publishing-controls.mts'

const logger = getDefaultLogger()

const FIELD_TIMEOUT_MS = 10 * MILLISECONDS_PER_SECOND

/**
 * How long the post-save re-read is given to report the target state, and how
 * often it asks. The re-read is the arbiter of success — never the click — and
 * it polls in place, so npm settling slowly costs time and nothing else.
 */
export const SAVE_VERIFY_TIMEOUT_MS = 90 * MILLISECONDS_PER_SECOND
export const SAVE_VERIFY_POLL_MS = 3 * MILLISECONDS_PER_SECOND

/**
 * Fill one form field, preferring the wire-contract input name and falling back
 * to the visible label. Names survive a DOM reshuffle better than structure;
 * labels survive a rename of the name attribute.
 */
export async function fillPublisherField(
  page: Page,
  config: { label: RegExp; name: string; value: string },
): Promise<void> {
  const cfg = { __proto__: null, ...config } as typeof config
  const byName = page.locator(`input[name="${cfg.name}"]`).first()
  if ((await byName.count()) > 0) {
    await byName.fill(cfg.value, { timeout: FIELD_TIMEOUT_MS })
    return
  }
  await page
    .getByLabel(cfg.label)
    .first()
    .fill(cfg.value, { timeout: FIELD_TIMEOUT_MS })
}

/**
 * Set one allowed-action grant, whatever shape npm renders its control in.
 *
 * A single locator is not enough and never was. npm renders some packages'
 * state as a HIDDEN input carrying the field name, and `setChecked` on one of
 * those throws "Not a checkbox or radio button" — which is how a live sweep
 * stopped on `@socketregistry/abab` with a hidden `allowPublish` encoding "on"
 * and no checkbox beside it. So the control is RESOLVED rather than assumed:
 * {@link resolveActionControlPlan} walks a captured inventory of the form's
 * controls in a fixed priority order and returns what to drive, and this
 * function only performs it.
 *
 * Returns the plan it performed, so a caller can log which rung answered — on a
 * form nobody documents, knowing the page rendered a `role="switch"` rather
 * than a checkbox is the finding.
 *
 * @throws {Error} When no rung matches, with every candidate control the
 *   capture found named in the failure block.
 */
export async function setPublisherActionControl(
  page: Page,
  config: {
    action: string
    checked: boolean
    label: RegExp
    name: string
    packageName: string
    url: string
  },
): Promise<ActionControlPlan> {
  const cfg = { __proto__: null, ...config } as typeof config
  const request = {
    actionTokens: grantTokensForAction(cfg.action),
    checked: cfg.checked,
    label: cfg.label,
    name: cfg.name,
  }
  const snapshot = await collectFormDomSnapshot(page)
  const candidates = collectActionControlCandidates(snapshot)
  const plan = resolveActionControlPlan(candidates, request)
  if (plan.how === 'unresolved') {
    throw new Error(
      formatUnresolvedActionControl({
        action: cfg.action,
        candidates,
        packageName: cfg.packageName,
        reason: plan.reason,
        request,
        url: cfg.url,
      }),
    )
  }
  if (plan.how === 'noop') {
    logger.substep(
      `${cfg.packageName}: "${cfg.action}" already reads as ${cfg.checked} — ${plan.reason}.`,
    )
    return plan
  }
  const control = page.locator(FORM_CONTROL_SELECTOR).nth(plan.index)
  if (plan.how === 'checkbox') {
    await control.setChecked(cfg.checked, {
      force: plan.force,
      timeout: FIELD_TIMEOUT_MS,
    })
  } else if (plan.how === 'radio') {
    await control.check({ force: plan.force, timeout: FIELD_TIMEOUT_MS })
  } else if (plan.how === 'select') {
    await control.selectOption(plan.option, { timeout: FIELD_TIMEOUT_MS })
  } else {
    // An ARIA toggle has no state of its own for playwright to set, so the
    // click is the only lever — and a click that changes nothing is a silent
    // failure, which is why the control is asked again afterwards.
    const before = await control.getAttribute('aria-checked')
    await control.click({ timeout: FIELD_TIMEOUT_MS })
    const after = await control.getAttribute('aria-checked')
    if (before === after) {
      throw new Error(
        [
          `What: ${cfg.packageName}'s "${cfg.action}" toggle did not change state, so the form still carries the old grant.`,
          `Where: ${cfg.url}`,
          `Saw: the ${plan.via}-matched role toggle still reports aria-checked=${JSON.stringify(after ?? '')} after the click.`,
          `Wanted: aria-checked to report ${cfg.checked}.`,
          'Fix: open the page and click that control by hand to see what it does. If it needs a keypress or a nested element clicked, add that shape to the ladder in scripts/repo/npm/configure-staged-publishing-controls.mts.',
        ].join('\n'),
      )
    }
  }
  logger.substep(
    `${cfg.packageName}: "${cfg.action}" set to ${cfg.checked} via a ${plan.how} control matched by ${plan.via}.`,
  )
  return plan
}

/**
 * Fill the WHOLE trusted-publisher form from `desired`. Always every field, so
 * a half-done earlier pass never survives as a residue, and both action grants
 * are set explicitly rather than left at whatever npm rendered.
 */
export async function fillTrustedPublisherForm(
  page: Page,
  desired: TrustedPublisherDesired,
  context: { packageName: string; url: string },
): Promise<void> {
  const ctx = { __proto__: null, ...context } as typeof context
  await fillPublisherField(page, {
    label: /organization|user|owner/i,
    name: 'repositoryOwner',
    value: desired.repositoryOwner,
  })
  await fillPublisherField(page, {
    label: /^repository/i,
    name: 'repositoryName',
    value: desired.repositoryName,
  })
  await fillPublisherField(page, {
    label: /workflow filename/i,
    name: 'workflowName',
    value: desired.workflowFilename,
  })
  await fillPublisherField(page, {
    label: /environment name/i,
    name: 'githubEnvironmentName',
    value: desired.environmentName,
  })
  // GRANTS ARE ADDED BEFORE THEY ARE CLEARED, and that order is a requirement
  // rather than a preference. npm's Allowed actions field is required and its
  // own help text says "At least one must be selected" — its CLI refuses a
  // trust write with neither flag, and the registry answers a permissionless
  // body with a 400. Clearing "npm publish" first on a package that only has
  // that grant walks the form through the empty state npm rejects; adding the
  // staged grant first means the form is never empty at any point.
  await setPublisherActionControl(page, {
    action: STAGE_PUBLISH_ACTION,
    checked: desired.allowNpmStagePublish,
    label: /allow npm stage publish/i,
    name: 'allowStagePublish',
    packageName: ctx.packageName,
    url: ctx.url,
  })
  await setPublisherActionControl(page, {
    action: DIRECT_PUBLISH_ACTION,
    checked: desired.allowNpmPublish,
    label: /allow npm publish/i,
    name: 'allowPublish',
    packageName: ctx.packageName,
    url: ctx.url,
  })
}

/**
 * Click the form's Save affordance.
 */
export async function clickPublisherSave(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /save changes|save|update|set up/i })
    .first()
    .click({ timeout: FIELD_TIMEOUT_MS })
}

/**
 * The fields a settings payload still reports off-target, named for the
 * operator. Empty means the save landed. Pure, so the verify contract is
 * testable from an invented payload.
 */
export function verifyStagedPayload(
  payload: unknown,
  desired: TrustedPublisherDesired,
): string[] {
  const reading = readTrustedPublisherState(payload)
  if (reading.blockState !== 'present') {
    return [
      `the re-read reported the trusted-publisher block as ${reading.blockState}`,
    ]
  }
  const mismatches: string[] = []
  if (!bindingMatchesTarget(reading.binding)) {
    mismatches.push('the saved binding does not match the target')
  }
  const actions = reading.actions
  if (!actions) {
    mismatches.push('the re-read carried no allowed-actions block')
    return mismatches
  }
  if (desired.allowNpmStagePublish && !permitsStagedPublish(actions)) {
    mismatches.push('"npm stage publish" is still not allowed')
  }
  if (!desired.allowNpmPublish && permitsDirectPublish(actions)) {
    mismatches.push('"npm publish" is still allowed')
  }
  return mismatches
}

/**
 * One package's whole write, driven where the page already is.
 *
 * `readPayload` is how this module reads without navigating — the caller hands
 * in the same in-page fetch the read lane uses, so the verify never reloads.
 * `pause` is the operator wait, also in place. Both are injected rather than
 * imported so the sequence is unit-testable with a fake page and no browser.
 *
 * The interruption contract is the point. `ensureFormOpen` → fill → save runs
 * with no classification in the middle, because every classification is a
 * chance to hand control to a pause path, and a pause that reloads is what
 * closed the form on the live run this replaced. If the fill or the save throws
 * while a genuine challenge is on screen, the pause happens HERE and the form
 * is reopened once; anything else propagates with its own message.
 *
 * @throws {Error} When the form cannot be opened, when the fill or save fails
 *   with no challenge to explain it, or when the re-read never reports the
 *   target state within {@link SAVE_VERIFY_TIMEOUT_MS}.
 */
export async function saveTrustedPublisherInPlace(
  page: Page,
  config: {
    challengePresent: () => Promise<boolean>
    desired: TrustedPublisherDesired
    label: string
    pause: () => Promise<void>
    readPayload: () => Promise<unknown>
    url: string
    verifyPollMs?: number | undefined
    verifyTimeoutMs?: number | undefined
  },
): Promise<{ mismatches: string[]; ok: boolean }> {
  const cfg = { __proto__: null, ...config } as typeof config
  const maxFormAttempts = 2
  let opened = false
  for (let attempt = 1; attempt <= maxFormAttempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop -- at most two serial passes: the form and its single reopen.
      const revealPath = await ensureFormOpen(page)
      logger.substep(
        `${cfg.label}: trusted-publisher form opened via ${revealPath}`,
      )
      // No classification between here and the save. A challenge that lands
      // mid-fill surfaces as a locator failure below, which is where it is
      // handled — asking the page a question here is what let a pause reload
      // the form out from under the fill.
      // eslint-disable-next-line no-await-in-loop -- serial: one live form at a time.
      await fillTrustedPublisherForm(page, cfg.desired, {
        packageName: cfg.label,
        url: cfg.url,
      })
      // eslint-disable-next-line no-await-in-loop -- serial: one live form at a time.
      await clickPublisherSave(page)
      opened = true
      break
    } catch (e) {
      // eslint-disable-next-line no-await-in-loop -- serial: the page is asked once, only on failure.
      if (attempt >= maxFormAttempts || !(await cfg.challengePresent())) {
        throw e
      }
      logger.warn(
        `${cfg.label}: a human-verification challenge interrupted the form. Waiting it out in place, then reopening the form once.`,
      )
      // eslint-disable-next-line no-await-in-loop -- serial pause while the operator solves the challenge.
      await cfg.pause()
    }
  }
  if (!opened) {
    return { mismatches: ['the form was never saved'], ok: false }
  }
  const pollMs = cfg.verifyPollMs ?? SAVE_VERIFY_POLL_MS
  const deadline = Date.now() + (cfg.verifyTimeoutMs ?? SAVE_VERIFY_TIMEOUT_MS)
  let mismatches: string[] = ['the save was not re-read yet']
  for (;;) {
    let payload: unknown
    try {
      // eslint-disable-next-line no-await-in-loop -- serial poll while npm settles.
      payload = await cfg.readPayload()
    } catch {
      payload = undefined
    }
    mismatches = verifyStagedPayload(payload, cfg.desired)
    if (!mismatches.length) {
      return { mismatches: [], ok: true }
    }
    if (Date.now() >= deadline) {
      return { mismatches, ok: false }
    }
    // eslint-disable-next-line no-await-in-loop -- serial poll interval.
    await sleep(pollMs)
  }
}
