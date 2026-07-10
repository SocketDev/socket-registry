import assert from 'node:assert/strict'

import { test } from 'vitest'

import { parseArgs } from '../../../scripts/fleet/researching-recency/cli.mts'

test('parseArgs reads the topic positional and --flag=value form', () => {
  const args = parseArgs([
    'rolldown',
    '--emit=compact',
    '--days=14',
    '--depth=deep',
  ])
  assert.equal(args.topic, 'rolldown')
  assert.equal(args.emit, 'compact')
  assert.equal(args.days, 14)
  assert.equal(args.depth, 'deep')
})

test('parseArgs reads the --flag value (space-separated) form', () => {
  const args = parseArgs([
    'rolldown',
    '--save-dir',
    '/tmp/out',
    '--web-file',
    '/tmp/web.json',
  ])
  assert.equal(args.saveDir, '/tmp/out')
  assert.equal(args.webFile, '/tmp/web.json')
})

test('parseArgs splits --search into a source list', () => {
  const args = parseArgs(['rolldown', '--search=github,hackernews,reddit'])
  assert.deepEqual(args.search, ['github', 'hackernews', 'reddit'])
})
