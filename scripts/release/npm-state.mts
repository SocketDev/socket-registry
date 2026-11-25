import crypto from 'node:crypto'
import {
  httpJson,
  HttpResponseError,
} from '@socketsecurity/lib-stable/http-request'
import { isPlainObject } from '@socketsecurity/lib-stable/objects/predicates'

import { encodeNpmRegistryName } from '../util/npm-registry-name.mts'

import type { RegistryLatestRead } from './anchor.mts'

const NPM_REGISTRY_URL = 'https://registry.npmjs.org'

function cacheBustedRead(
  url: string,
  accept: string,
  nonce: string = crypto.randomUUID(),
): { headers: Record<string, string>; url: string } {
  const separator = url.includes('?') ? '&' : '?'
  return {
    headers: {
      accept,
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
    url: `${url}${separator}_cb=${nonce}`,
  }
}

/**
 * The registry `dist-tags.latest` for a package, distinguishing "the registry
 * answered: never published" (a 404 — `reachable: true, latest: undefined`)
 * from "the registry could not be consulted" (network failure, timeout, 5xx —
 * `reachable: false`). Reads the packument (not `npm view`, which trips this
 * repo's pnpm devEngines). The changelog anchor derivation hard-stops on
 * `reachable: false`: offline, the released base cannot be confirmed and a
 * stale local tag would silently widen the range.
 */
export async function fetchLatestPublishedVersionChecked(
  name: string,
): Promise<RegistryLatestRead> {
  const url = `${NPM_REGISTRY_URL}/${encodeNpmRegistryName(name)}`
  const read = cacheBustedRead(url, 'application/vnd.npm.install-v1+json')
  try {
    const json = await httpJson<{
      'dist-tags'?: { latest?: string | undefined } | undefined
    }>(read.url, {
      headers: read.headers,
      timeout: 15_000,
    })
    return { latest: json['dist-tags']?.latest, reachable: true }
  } catch (e) {
    if (e instanceof HttpResponseError && e.response.status === 404) {
      return { latest: undefined, reachable: true }
    }
    return { reachable: false }
  }
}

interface RegistryReleaseState {
  latest: string | undefined
  timeMap: Record<string, string>
  /**
   * The LIVE `versions` set — what is public right now. Together with the
   * time map it splits publish history: never published, currently
   * published, and published-then-unpublished.
   */
  versions: string[]
}

type RegistryReleaseStateRead =
  | { reachable: true; state: RegistryReleaseState }
  | { reachable: false }

/**
 * Read release evidence, distinguishing an unreachable registry from a 404.
 * A 404 has no public metadata; it does not clear a release reservation.
 */
async function fetchRegistryReleaseStateChecked(
  name: string,
): Promise<RegistryReleaseStateRead> {
  const url = `${NPM_REGISTRY_URL}/${encodeNpmRegistryName(name)}`
  // Full packument — the abbreviated install-v1 format drops `time`.
  const read = cacheBustedRead(url, 'application/json')
  function isStringRecord(value: unknown): value is Record<string, string> {
    return (
      isPlainObject(value) &&
      Object.values(value).every(item => typeof item === 'string')
    )
  }
  try {
    const json = await httpJson<unknown>(read.url, {
      headers: read.headers,
      timeout: 15_000,
    })
    if (!isPlainObject(json)) {
      return { reachable: false }
    }
    const tags = json['dist-tags']
    const latest = isPlainObject(tags) ? tags['latest'] : undefined
    const time = json['time']
    const versions = json['versions']
    if (
      !isStringRecord(time) ||
      (tags !== undefined && !isPlainObject(tags)) ||
      (latest !== undefined && typeof latest !== 'string') ||
      (versions !== undefined && !isPlainObject(versions))
    ) {
      return { reachable: false }
    }
    return {
      reachable: true,
      state: {
        latest: typeof latest === 'string' ? latest : undefined,
        timeMap: time,
        versions: Object.keys(versions ?? {}),
      },
    }
  } catch (error) {
    if (error instanceof HttpResponseError && error.response.status === 404) {
      return {
        reachable: true,
        state: { latest: undefined, timeMap: {}, versions: [] },
      }
    }
    return { reachable: false }
  }
}

/**
 * Fetch the registry publish ledger. Unreachable, unpublished, and malformed
 * reads retain the existing tolerant undefined contract for release gates.
 */
export async function fetchRegistryReleaseState(
  name: string,
): Promise<RegistryReleaseState | undefined> {
  const read = await fetchRegistryReleaseStateChecked(name)
  return read.reachable ? read.state : undefined
}
