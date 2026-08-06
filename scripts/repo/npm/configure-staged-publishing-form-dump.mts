/**
 * @file The `--dump-form` diagnostic lane: open npm's trusted-publisher form,
 *   print its STRUCTURE fully redacted, and print what the writer's resolution
 *   ladder would do with it — then close the window having saved nothing.
 *   This is the DOM twin of `--dump-payload`. The payload lane answers "where
 *   does npm keep the trusted-publisher data"; this one answers "what control
 *   does npm render for a grant", which is the question a live sweep hit when
 *   it refused with "the allowPublish control is a hidden input encoding 'on'
 *   and no checkbox is rendered to flip it to false". No payload dump can
 *   answer that, because the payload has no controls in it.
 *   This lane DOES click, and only in the one place it must: the form is behind
 *   an Edit or add affordance, so {@link ensureFormOpen} is what makes there be
 *   a form to describe. It never fills a field, never sets a grant, and never
 *   clicks Save — a failure to open the form is reported and the page-level
 *   structure is dumped anyway, since a page that renders no form at all is
 *   itself the finding.
 *   ONE session covers every package, same as the payload lane: a per-package
 *   window would ask the operator to clear the two-factor step-up again for
 *   each name.
 */

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import type { Page } from 'playwright-core'

import { ensureFormOpen } from '../../fleet/publish-infra/npm/trusted-publisher-page.mts'

import {
  openNpmSettingsSession,
  waitForAccessPage,
} from './configure-staged-publishing-browser.mts'
import {
  collectActionControlCandidates,
  resolveActionControlPlan,
} from './configure-staged-publishing-controls.mts'
import {
  describeFormDomTree,
  summarizeFormDomControls,
} from './configure-staged-publishing-form-dom.mts'
import { collectFormDomSnapshot } from './configure-staged-publishing-form-probe.mts'
import {
  buildPackageAccessUrl,
  DIRECT_PUBLISH_ACTION,
  grantTokensForAction,
  STAGE_PUBLISH_ACTION,
} from './configure-staged-publishing-plan.mts'

import type { ActionControlCandidate } from './configure-staged-publishing-controls.mts'
import type { StagedConfigurationTarget } from './configure-staged-publishing-plan.mts'

const logger = getDefaultLogger()

/**
 * The two grants the writer sets, with the name, label, and wanted state it
 * would use for each. Stage-only is the target, so the direct grant's wanted
 * state is `false` here exactly as it is on a real write.
 */
export const DUMPED_ACTION_REQUESTS: ReadonlyArray<{
  action: string
  checked: boolean
  label: RegExp
  name: string
}> = [
  {
    action: DIRECT_PUBLISH_ACTION,
    checked: false,
    label: /allow npm publish/i,
    name: 'allowPublish',
  },
  {
    action: STAGE_PUBLISH_ACTION,
    checked: true,
    label: /allow npm stage publish/i,
    name: 'allowStagePublish',
  },
]

/**
 * What the resolution ladder would do with `candidates`, as operator-readable
 * lines. Pure, so the reporting half of the lane is testable without a browser.
 *
 * Every grant reports, not only the failing one. A run that resolves the staged
 * grant and not the direct one is a different situation from one that resolves
 * neither, and the two need different next steps.
 */
export function describeLadderVerdicts(
  candidates: readonly ActionControlCandidate[],
): string[] {
  const lines: string[] = []
  for (let i = 0, { length } = DUMPED_ACTION_REQUESTS; i < length; i += 1) {
    const wanted = DUMPED_ACTION_REQUESTS[i]!
    const plan = resolveActionControlPlan(candidates, {
      actionTokens: grantTokensForAction(wanted.action),
      checked: wanted.checked,
      label: wanted.label,
      name: wanted.name,
    })
    lines.push(`  "${wanted.action}" → ${wanted.checked}`)
    if (plan.how === 'unresolved') {
      lines.push(`    UNRESOLVED: ${plan.reason}`)
    } else if (plan.how === 'noop') {
      lines.push(`    already correct: ${plan.reason}`)
    } else if (plan.how === 'select') {
      lines.push(
        `    would select option ${JSON.stringify(plan.option)} on control#${plan.index}, matched by ${plan.via}`,
      )
    } else {
      lines.push(
        `    would drive control#${plan.index} as a ${plan.how}, matched by ${plan.via}`,
      )
    }
  }
  return lines
}

/**
 * Print one package's trusted-publisher form structure and ladder verdict.
 *
 * @throws {Error} When the operator wait outlasts its budget or the session is
 *   signed out. A form that will not open is reported, not thrown: the
 *   page-level structure is the answer in that case.
 */
export async function dumpOneFormStructure(
  page: Page,
  target: StagedConfigurationTarget,
): Promise<void> {
  await waitForAccessPage(page, target)
  logger.log('')
  logger.log(
    `Form structure for ${target.name} (no string value prints unless it is a short enum or npm's own form copy):`,
  )
  try {
    const revealPath = await ensureFormOpen(page)
    logger.log(`  form opened via ${revealPath}`)
  } catch (e) {
    logger.warn(
      `  the trusted-publisher form did not open, so what follows is the page as it stands: ${errorMessage(e)}`,
    )
  }
  const snapshot = await collectFormDomSnapshot(page)
  logger.log('')
  const tree = describeFormDomTree(snapshot)
  for (let i = 0, { length } = tree; i < length; i += 1) {
    logger.log(tree[i]!)
  }
  logger.log('')
  const summary = summarizeFormDomControls(snapshot)
  for (let i = 0, { length } = summary; i < length; i += 1) {
    logger.log(summary[i]!)
  }
  logger.log('')
  logger.log('What the writer would do with this form:')
  const verdicts = describeLadderVerdicts(
    collectActionControlCandidates(snapshot),
  )
  for (let i = 0, { length } = verdicts; i < length; i += 1) {
    logger.log(verdicts[i]!)
  }
}

/**
 * Dump the trusted-publisher form structure for each named package, through one
 * browser session, writing nothing.
 *
 * @throws {Error} When the operator wait outlasts its budget or the session is
 *   signed out.
 */
export async function dumpFormStructure(
  packageNames: readonly string[],
  options?: { profileDir?: string | undefined } | undefined,
): Promise<void> {
  const opts = { __proto__: null, ...options } as NonNullable<typeof options>
  const session = await openNpmSettingsSession({
    profileDir: opts.profileDir || undefined,
  })
  try {
    logger.success(
      `Signed in to npm as ${session.user}. Opening ${packageNames.length} package form(s) to describe them. Nothing is filled and nothing is saved. Finish any sign-in, two-factor code, or challenge in the Chrome window when asked.`,
    )
    for (let i = 0, { length } = packageNames; i < length; i += 1) {
      const name = packageNames[i]!
      const target: StagedConfigurationTarget = {
        latestVersion: undefined,
        name,
        // The dump lane never writes, so it needs no registry evidence; zero is
        // the honest value for a read it did not perform.
        publishedVersionCount: 0,
        settingsUrl: buildPackageAccessUrl(name),
      }
      // eslint-disable-next-line no-await-in-loop -- one browser page, one package at a time.
      await dumpOneFormStructure(session.page, target)
    }
  } finally {
    await session.close()
  }
}
