import { sign } from 'node:crypto'

const { APP_PRIVATE_KEY, CLIENT_ID, GITHUB_REPOSITORY } = process.env
if (!APP_PRIVATE_KEY || !CLIENT_ID || !GITHUB_REPOSITORY) {
  throw new Error('Set the release App client ID, private key, and repository.')
}
const [owner, repo, extra] = GITHUB_REPOSITORY.split('/')
if (!owner || !repo || extra !== undefined) {
  throw new Error('Expected GITHUB_REPOSITORY to be owner/repository.')
}

const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const now = Math.floor(Date.now() / 1_000)
const claims = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
  iat: now - 60,
  exp: now + 540,
  iss: CLIENT_ID,
})}`
const signature = sign('RSA-SHA256', Buffer.from(claims), APP_PRIVATE_KEY)
const jwt = `${claims}.${signature.toString('base64url')}`

async function github(path, body) {
  const response = await fetch(`https://api.github.com${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${jwt}`,
      'content-type': 'application/json',
      'user-agent': 'socket-registry-release',
      'x-github-api-version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(
      `GitHub release App request failed with HTTP ${response.status}.`,
    )
  }
  return response.json()
}

const installation = await github(
  `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/installation`,
)
if (!Number.isSafeInteger(installation.id)) {
  throw new Error('GitHub returned an invalid release App installation ID.')
}
const { token } = await github(
  `/app/installations/${installation.id}/access_tokens`,
  {
    repositories: [repo],
    permissions: { contents: 'write' },
  },
)
if (typeof token !== 'string' || !token || /\s/u.test(token)) {
  throw new Error('GitHub returned an invalid release App token.')
}
process.stdout.write(token)
