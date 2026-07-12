import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectCleanBotClaim, hasAdversarialEvidence } from '../index.mts'

test('fires on bot-then-clean in one sentence', () => {
  assert.ok(
    detectCleanBotClaim('Bugbot completed its review with no issues found.'),
  )
  assert.ok(detectCleanBotClaim('The automated review came back clean.'))
  assert.ok(
    detectCleanBotClaim('Copilot posted no comments, so nothing to address.'),
  )
})

test('fires on clean-then-bot order', () => {
  assert.ok(detectCleanBotClaim('No findings from bugbot on this one.'))
})

test('does not fire across sentence boundaries', () => {
  assert.equal(
    detectCleanBotClaim(
      'Bugbot finished its pass. Meanwhile the kitchen is clean.',
    ),
    undefined,
  )
})

test('does not fire on unrelated bot mentions', () => {
  assert.equal(
    detectCleanBotClaim('The deploy bot restarted the service cleanly.'),
    undefined,
  )
})

test('does not fire inside code fences', () => {
  assert.equal(
    detectCleanBotClaim(
      'Logs below:\n```\nbugbot: no issues found\n```\nStill investigating.',
    ),
    undefined,
  )
})

test('prose adversarial language suppresses', () => {
  assert.ok(
    hasAdversarialEvidence(
      'Bugbot found nothing, so I ran an adversarial review pass myself.',
      [],
    ),
  )
  assert.ok(
    hasAdversarialEvidence('Two reviewers tried to refute the change.', []),
  )
})

test('spawned reviewer agent suppresses', () => {
  const toolUses = [
    {
      input: {
        description: 'Adversarial shell review of PR diff',
        prompt: 'You are an adversarial code reviewer. Try to break this.',
      },
      name: 'Agent',
    },
  ] as never
  assert.ok(hasAdversarialEvidence('Bugbot: no issues found.', toolUses))
})

test('unrelated tool uses do not suppress', () => {
  const toolUses = [{ input: { command: 'git status' }, name: 'Bash' }] as never
  assert.equal(
    hasAdversarialEvidence('Bugbot: no issues found.', toolUses),
    false,
  )
})
