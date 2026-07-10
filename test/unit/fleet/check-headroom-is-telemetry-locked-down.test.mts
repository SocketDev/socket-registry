// vitest specs for headroom-is-telemetry-locked-down — the lockdown invariant +
// the wrapper generator that force headroom's telemetry beacon + HuggingFace
// model fetch off for every invocation. The filesystem orchestration (the
// check's import + assert) is covered by the check running in `check --all`.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  HEADROOM_LOCKDOWN_ENV,
  lockdownViolations,
  lockdownWrapperScript,
  lockdownWrapperScriptWin,
} from '../../../.claude/hooks/fleet/setup-security-tools/lib/headroom.mts'

describe('headroom lockdown — the env disables telemetry + model fetch', () => {
  test('the shipped HEADROOM_LOCKDOWN_ENV has no violations', () => {
    assert.deepEqual(lockdownViolations(HEADROOM_LOCKDOWN_ENV), [])
  })
  test('telemetry-on is flagged', () => {
    const v = lockdownViolations({
      HEADROOM_TELEMETRY: 'on',
      HF_HUB_OFFLINE: '1',
    })
    assert.equal(v.length, 1)
    assert.match(v[0]!, /HEADROOM_TELEMETRY/)
  })
  test('model fetch left enabled is flagged', () => {
    const v = lockdownViolations({ HEADROOM_TELEMETRY: 'off' })
    assert.equal(v.length, 1)
    assert.match(v[0]!, /HF_HUB_OFFLINE/)
  })
  test('an empty env flags BOTH', () => {
    assert.equal(lockdownViolations({}).length, 2)
  })
})

describe('headroom lockdown — the wrapper exports before exec', () => {
  test('POSIX wrapper exports every lockdown var before exec', () => {
    const w = lockdownWrapperScript('/dlx/h/.venv/bin/headroom')
    const execIdx = w.indexOf('exec ')
    assert.ok(execIdx > 0, 'has an exec line')
    for (const k of Object.keys(HEADROOM_LOCKDOWN_ENV)) {
      const idx = w.indexOf(`export ${k}=`)
      assert.ok(idx !== -1 && idx < execIdx, `${k} exported before exec`)
    }
    assert.match(w, /exec "\/dlx\/h\/\.venv\/bin\/headroom" "\$@"/)
  })
  test('Windows wrapper sets every lockdown var', () => {
    const w = lockdownWrapperScriptWin('C:\\dlx\\h\\headroom.exe')
    for (const k of Object.keys(HEADROOM_LOCKDOWN_ENV)) {
      assert.match(w, new RegExp(`set ${k}=`))
    }
  })
  test('the env actually disables telemetry + model fetch', () => {
    assert.equal(HEADROOM_LOCKDOWN_ENV['HEADROOM_TELEMETRY'], 'off')
    assert.equal(HEADROOM_LOCKDOWN_ENV['HF_HUB_OFFLINE'], '1')
  })
})
