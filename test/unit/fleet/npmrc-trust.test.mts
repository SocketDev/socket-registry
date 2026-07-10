import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  detectAuthEnvPlaceholderInNpmrc,
  detectOptoutInCommands,
  detectOptoutInFileText,
  TRUST_OPTOUT_ENV_VARS,
} from '../../../.claude/hooks/fleet/_shared/npmrc-trust.mts'
import { parseCommands } from '../../../.claude/hooks/fleet/_shared/shell-command.mts'

const [AUTH_FILE_VAR, USERCONFIG_VAR] = TRUST_OPTOUT_ENV_VARS

describe('detectOptoutInCommands', () => {
  const found = (cmd: string) =>
    [...detectOptoutInCommands(parseCommands(cmd))].toSorted()

  test('detects a prefix assignment (auth-file var)', () => {
    const cmd = `${AUTH_FILE_VAR}=.npmrc pnpm i`
    assert.deepEqual(found(cmd), [AUTH_FILE_VAR])
  })

  test('detects export (userconfig var)', () => {
    const cmd = `export ${USERCONFIG_VAR}=.npmrc`
    assert.deepEqual(found(cmd), [USERCONFIG_VAR])
  })

  test('detects a bare repo-relative assignment', () => {
    const cmd = `${USERCONFIG_VAR}=./.npmrc`
    assert.deepEqual(found(cmd), [USERCONFIG_VAR])
  })

  test('ignores a HOME-pointed USERCONFIG', () => {
    assert.deepEqual(found(`export ${USERCONFIG_VAR}=~/.npmrc`), [])
  })

  test('ignores an absolute non-repo USERCONFIG', () => {
    assert.deepEqual(found(`${USERCONFIG_VAR}=/etc/npmrc pnpm i`), [])
  })

  test('ignores /dev/null', () => {
    assert.deepEqual(found(`${USERCONFIG_VAR}=/dev/null pnpm i`), [])
  })

  test('ignores an ordinary command', () => {
    assert.deepEqual(found('pnpm install'), [])
  })
})

describe('detectOptoutInFileText', () => {
  test('detects an export in a shell script (auth-file var)', () => {
    const hits = detectOptoutInFileText(
      `#!/bin/sh\nexport ${AUTH_FILE_VAR}=.npmrc\n`,
    )
    assert.equal(hits.length, 1)
    assert.equal(hits[0]!.name, AUTH_FILE_VAR)
    assert.equal(hits[0]!.line, 2)
  })

  test('detects a YAML env assignment (userconfig var)', () => {
    const hits = detectOptoutInFileText(`env:\n  ${USERCONFIG_VAR}: .npmrc\n`)
    assert.equal(hits.length, 1)
  })

  test('ignores a HOME-pointed YAML value', () => {
    assert.deepEqual(
      detectOptoutInFileText(`env:\n  ${USERCONFIG_VAR}: ~/.npmrc\n`),
      [],
    )
  })
})

describe('detectAuthEnvPlaceholderInNpmrc', () => {
  test('detects ${ENV} beside _authToken', () => {
    assert.deepEqual(
      detectAuthEnvPlaceholderInNpmrc(
        '//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n',
      ),
      [1],
    )
  })

  test('detects $ENV beside a registry key', () => {
    assert.deepEqual(detectAuthEnvPlaceholderInNpmrc('registry=$REG\n'), [1])
  })

  test('ignores a literal min-release-age line', () => {
    assert.deepEqual(detectAuthEnvPlaceholderInNpmrc('min-release-age=7\n'), [])
  })

  test('ignores a commented-out line', () => {
    assert.deepEqual(
      detectAuthEnvPlaceholderInNpmrc(
        '# _authToken=${OLD}\nmin-release-age=7\n',
      ),
      [],
    )
  })
})
