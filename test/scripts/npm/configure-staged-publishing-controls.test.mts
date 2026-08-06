/**
 * @file Tests for the allowed-action resolution ladder — the module that
 *   decides which control on npm's trusted-publisher form a grant is set
 *   through. Every shape here is INVENTED, and that is deliberate: npm does not
 *   document this form, so the writer's contract is "tolerate the shapes a form
 *   like this plausibly takes", and this file is where that tolerance is
 *   pinned down.
 *   The case that started it is the last group: a hidden `allowPublish` input
 *   encoding "on" with no checkbox beside it, which a live sweep met on
 *   `@socketregistry/abab`. The ladder must NOT invent a way to write that —
 *   it must refuse, and the refusal must name what it saw.
 */

import { describe, expect, test } from 'vitest'

import {
  encodesActionState,
  resolveActionControlPlan,
} from '../../../scripts/repo/npm/configure-staged-publishing-controls.mts'

import type { ActionControlCandidate } from '../../../scripts/repo/npm/configure-staged-publishing-controls.mts'

const CLEAR_DIRECT = {
  actionTokens: [
    'npm publish',
    'createPackage',
    'createPackageVersion',
    'publish',
  ],
  checked: false,
  label: /allow npm publish/i,
  name: 'allowPublish',
}

const ALLOW_STAGED = {
  actionTokens: ['npm stage publish', 'createStagedPackage', 'stagePublish'],
  checked: true,
  label: /allow npm stage publish/i,
  name: 'allowStagePublish',
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

describe('encodesActionState', () => {
  test('reads every on and off spelling a form control uses', () => {
    for (const on of ['on', 'true', 'yes', '1', 'checked', 'allowed']) {
      expect(encodesActionState(on)).toBe(true)
    }
    for (const off of ['off', 'false', 'no', '0', 'unchecked', 'denied']) {
      expect(encodesActionState(off)).toBe(false)
    }
  })

  test('an empty or unknown value is undefined, never false', () => {
    // Collapsing "cannot tell" into "off" is how a live grant gets skipped, so
    // ambiguity stays ambiguous and the caller fails loud instead.
    expect(encodesActionState('')).toBe(undefined)
    expect(encodesActionState('maybe')).toBe(undefined)
    expect(encodesActionState(undefined)).toBe(undefined)
  })
})

describe('resolveActionControlPlan — a native checkbox', () => {
  test('drives a rendered checkbox matched by name, unforced', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 3,
          name: 'allowPublish',
          tag: 'input',
          type: 'checkbox',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan).toEqual({
      force: false,
      how: 'checkbox',
      index: 3,
      via: 'name',
    })
  })

  test('forces a checkbox that exists but is styled away behind a label', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 7,
          labelText: 'Allow npm publish',
          name: 'allowPublish',
          rendered: false,
          tag: 'input',
          type: 'checkbox',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan).toEqual({
      force: true,
      how: 'checkbox',
      index: 7,
      via: 'name',
    })
  })

  test('prefers a rendered checkbox over a hidden twin of the same name', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 1,
          name: 'allowPublish',
          rendered: false,
          tag: 'input',
          type: 'hidden',
          value: 'off',
        }),
        candidate({
          index: 2,
          name: 'allowPublish',
          tag: 'input',
          type: 'checkbox',
          value: 'on',
        }),
      ],
      CLEAR_DIRECT,
    )
    // The classic hidden+checkbox pair: the hidden carries the OFF value and
    // the checkbox carries ON, so the checkbox is the control to drive.
    expect(plan).toEqual({
      force: false,
      how: 'checkbox',
      index: 2,
      via: 'name',
    })
  })
})

describe('resolveActionControlPlan — the other shapes', () => {
  test('picks the radio whose value encodes the wanted state', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 0,
          name: 'allowPublish',
          tag: 'input',
          type: 'radio',
          value: 'on',
        }),
        candidate({
          index: 1,
          name: 'allowPublish',
          tag: 'input',
          type: 'radio',
          value: 'off',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan).toEqual({ force: false, how: 'radio', index: 1, via: 'name' })
  })

  test('selects the option encoding the wanted state', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 5,
          name: 'allowPublish',
          optionValues: ['on', 'off'],
          tag: 'select',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan).toEqual({
      how: 'select',
      index: 5,
      option: 'off',
      via: 'name',
    })
  })

  test('clicks a role="switch" whose aria-checked disagrees', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          ariaChecked: 'true',
          index: 8,
          name: 'allowPublish',
          role: 'switch',
          tag: 'button',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan).toEqual({ how: 'toggle', index: 8, via: 'name' })
  })

  test('leaves a role="switch" alone when it already reports the wanted state', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          ariaChecked: 'false',
          index: 8,
          name: 'allowPublish',
          role: 'switch',
          tag: 'button',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan.how).toBe('noop')
  })

  test('matches a control by its grant token when the name has moved', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 4,
          name: 'permissions',
          tag: 'input',
          type: 'checkbox',
          value: 'createPackage',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan).toEqual({
      force: false,
      how: 'checkbox',
      index: 4,
      via: 'value-token',
    })
  })

  test('matches by label as the last rung, when neither name nor token does', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 6,
          labelText: 'Allow npm stage publish',
          name: 'grantTwo',
          tag: 'input',
          type: 'checkbox',
        }),
      ],
      ALLOW_STAGED,
    )
    expect(plan).toEqual({
      force: false,
      how: 'checkbox',
      index: 6,
      via: 'label',
    })
  })

  test('a name match outranks a label match on a different control', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 1,
          labelText: 'Allow npm publish',
          tag: 'input',
          type: 'checkbox',
        }),
        candidate({
          index: 2,
          name: 'allowPublish',
          tag: 'input',
          type: 'checkbox',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan).toMatchObject({ index: 2, via: 'name' })
  })
})

describe('resolveActionControlPlan — refusals', () => {
  test('a hidden input already encoding the wanted state is a no-op', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 4,
          name: 'allowPublish',
          rendered: false,
          tag: 'input',
          type: 'hidden',
          value: 'off',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan.how).toBe('noop')
  })

  test('a hidden "on" with no checkbox refuses and explains the idiom', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 4,
          name: 'allowPublish',
          rendered: false,
          tag: 'input',
          type: 'hidden',
          value: 'on',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan.how).toBe('unresolved')
    const reason = plan.how === 'unresolved' ? plan.reason : ''
    expect(reason).toContain('hidden input encoding "on"')
    expect(reason).toContain('the hidden carries the OFF value')
    expect(reason).toContain('does not offer to change')
  })

  test('a form with no matching control at all says exactly that', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 0,
          name: 'workflowName',
          tag: 'input',
          type: 'text',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan.how).toBe('unresolved')
    expect(plan.how === 'unresolved' ? plan.reason : '').toContain(
      'no control on the form carries the name "allowPublish"',
    )
  })

  test('a disabled-only match is reported as disabled, not as missing', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          disabled: true,
          index: 3,
          name: 'allowPublish',
          tag: 'input',
          type: 'checkbox',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan.how).toBe('unresolved')
    expect(plan.how === 'unresolved' ? plan.reason : '').toContain(
      'is disabled',
    )
  })

  test('a grant-token radio cannot CLEAR a grant, and says so', () => {
    // Picking a radio grants the action it names; there is no radio that means
    // "not this action", so a clear has nothing to select.
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 2,
          name: 'permission',
          tag: 'input',
          type: 'radio',
          value: 'createPackageVersion',
        }),
      ],
      CLEAR_DIRECT,
    )
    expect(plan.how).toBe('unresolved')
  })

  test('the same grant-token radio DOES resolve when the grant is being added', () => {
    const plan = resolveActionControlPlan(
      [
        candidate({
          index: 2,
          name: 'permission',
          tag: 'input',
          type: 'radio',
          value: 'createStagedPackage',
        }),
      ],
      ALLOW_STAGED,
    )
    expect(plan).toMatchObject({ how: 'radio', index: 2, via: 'value-token' })
  })
})
