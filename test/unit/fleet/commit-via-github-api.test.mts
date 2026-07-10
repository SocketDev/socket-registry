// vitest specs for commitViaGithubApi — the blob -> tree -> commit -> ref PATCH
// helper that lands a SIGNED (web-flow-verified) commit from CI without a GPG
// key. Mocks the GitHub git-objects API with nock under disableNetConnect()
// (httpJson on Node uses node:http, so nock intercepts it).

import assert from 'node:assert/strict'

import nock from 'nock'
import { afterAll, afterEach, beforeAll, test } from 'vitest'

import { commitViaGithubApi } from '../../../scripts/fleet/lib/commit-via-github-api.mts'

const API = 'https://api.github.com'

beforeAll(() => {
  nock.disableNetConnect()
})

afterAll(() => {
  nock.enableNetConnect()
})

afterEach(() => {
  nock.cleanAll()
})

test('chains blob -> tree -> commit -> ref and returns the new commit SHA', async () => {
  const scope = nock(API)
    .post('/repos/o/r/git/blobs')
    .reply(201, { sha: 'blobA' })
    .post('/repos/o/r/git/blobs')
    .reply(201, { sha: 'blobB' })
    .post('/repos/o/r/git/trees')
    .reply(201, { sha: 'treeX' })
    .post('/repos/o/r/git/commits')
    .reply(201, { sha: 'commitZ' })
    .patch('/repos/o/r/git/refs/heads/main')
    .reply(200, {})

  const sha = await commitViaGithubApi({
    baseTreeSha: 'basetree1',
    branch: 'main',
    files: [
      { content: '{"version":"1.1.0"}', path: 'package.json' },
      { content: '# Changelog', path: 'CHANGELOG.md' },
    ],
    message: 'chore: bump version to 1.1.0',
    parentSha: 'parent1',
    repo: 'o/r',
    token: 'tok',
  })

  assert.equal(sha, 'commitZ')
  // Every endpoint was exercised.
  scope.done()
})

test('sends base64 blob content, a base_tree, and the parent/message', async () => {
  const scope = nock(API)
    .post('/repos/o/r/git/blobs', body => {
      assert.equal(body.encoding, 'base64')
      assert.equal(
        Buffer.from(body.content, 'base64').toString('utf8'),
        '{"v":1}',
      )
      return true
    })
    .reply(201, { sha: 'b1' })
    .post('/repos/o/r/git/trees', body => {
      assert.equal(body.base_tree, 'basetree1')
      assert.equal(body.tree[0].path, 'package.json')
      assert.equal(body.tree[0].mode, '100644')
      assert.equal(body.tree[0].sha, 'b1')
      return true
    })
    .reply(201, { sha: 't1' })
    .post('/repos/o/r/git/commits', body => {
      assert.equal(body.message, 'chore: bump version to 1.1.0')
      assert.deepEqual(body.parents, ['parent1'])
      assert.equal(body.tree, 't1')
      return true
    })
    .reply(201, { sha: 'c1' })
    .patch('/repos/o/r/git/refs/heads/main', body => {
      assert.equal(body.sha, 'c1')
      return true
    })
    .reply(200, {})

  const sha = await commitViaGithubApi({
    baseTreeSha: 'basetree1',
    branch: 'main',
    files: [{ content: '{"v":1}', path: 'package.json' }],
    message: 'chore: bump version to 1.1.0',
    parentSha: 'parent1',
    repo: 'o/r',
    token: 'tok',
  })

  assert.equal(sha, 'c1')
  scope.done()
})
