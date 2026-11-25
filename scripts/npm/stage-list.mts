import os from 'node:os'

import {
  extractHttpStatus,
  getPackumentSlim,
} from '@socketsecurity/lib-stable/eco/npm/meta'

import { runCapture } from '../lib/run-command.mts'

export interface StageListEntry {
  name: string
  stageId: string
  version: string
}

export function parseStageListJson(stdout: string): StageListEntry[] {
  const value: unknown = JSON.parse(stdout.trim())
  if (typeof value !== 'object' || value === null) {
    throw new Error('npm staging returned an invalid list.')
  }

  const entries: unknown[] = Array.isArray(value) ? value : Object.values(value)
  return entries.map(item => {
    if (typeof item !== 'object' || item === null) {
      throw new Error('npm staging returned an invalid entry.')
    }
    const raw = item as Record<string, unknown>
    const name = raw['packageName'] ?? raw['name']
    const stageId = raw['id'] ?? raw['stageId']
    const version = raw['version']
    if (
      typeof name !== 'string' ||
      !name ||
      typeof stageId !== 'string' ||
      !/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/iu.test(
        stageId,
      ) ||
      typeof version !== 'string' ||
      !version
    ) {
      throw new Error('npm staging returned an incomplete package identity.')
    }
    return { name, stageId, version }
  })
}

export async function listStagedPackages(): Promise<StageListEntry[]> {
  // Run outside the workspace so npm does not enforce its pnpm-only devEngines.
  const cwd = os.tmpdir()
  const result = await runCapture('npm', ['stage', 'list', '--json'], cwd, {
    captureStderr: true,
  })
  if (result.code !== 0) {
    throw new Error('npm stage list failed. Confirm your local npm login.')
  }
  const staged = parseStageListJson(result.stdout)
  if (!staged.length) {
    // An unauthenticated list can appear empty. Prove login separately.
    const whoami = await runCapture('npm', ['whoami'], cwd, {
      captureStderr: true,
    })
    if (whoami.code !== 0) {
      throw new Error(
        'npm returned an empty staging list without an authenticated session.',
      )
    }
  }
  return staged
}

export async function isAlreadyPublished(
  name: string,
  version: string,
): Promise<boolean> {
  try {
    const meta = await getPackumentSlim(name)
    return Object.hasOwn(meta.versions, version)
  } catch (error) {
    if (extractHttpStatus(error) === 404) {
      return false
    }
    throw error
  }
}
