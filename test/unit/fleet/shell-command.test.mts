import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import { parseCommands } from '../../../.claude/hooks/fleet/_shared/shell-command.mts'

describe('parseCommands', () => {
  test('parses a simple binary + args', () => {
    const cmds = parseCommands('pnpm install')
    assert.equal(cmds.length, 1)
    assert.equal(cmds[0]!.binary, 'pnpm')
    assert.deepEqual(cmds[0]!.args, ['install'])
  })

  test('splits on semicolon', () => {
    const cmds = parseCommands('echo a; echo b')
    assert.equal(cmds.length, 2)
    assert.equal(cmds[0]!.binary, 'echo')
    assert.equal(cmds[1]!.binary, 'echo')
  })

  test('splits on &&', () => {
    const cmds = parseCommands('pnpm i && pnpm test')
    assert.equal(cmds.length, 2)
    assert.equal(cmds[1]!.binary, 'pnpm')
    assert.deepEqual(cmds[1]!.args, ['test'])
  })

  test('captures prefix assignments', () => {
    const cmds = parseCommands('FOO=bar node script.mts')
    assert.equal(cmds.length, 1)
    assert.ok(cmds[0]!.assignments.some(a => a.startsWith('FOO=')))
    assert.equal(cmds[0]!.binary, 'node')
  })

  test('returns empty array for empty input', () => {
    assert.deepEqual(parseCommands(''), [])
    assert.deepEqual(parseCommands('  '), [])
  })
})
