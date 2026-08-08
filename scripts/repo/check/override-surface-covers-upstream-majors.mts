#!/usr/bin/env node
/*
 * @file Repo gate, online tier: every override's exports surface covers the
 *   union of specifiers that are legal against EVERY supported upstream
 *   major. One override replaces all upstream versions a consumer pins, so a
 *   file upstream ships without an exports map is a specifier consumers may
 *   require; a closed or incomplete override map turns that into
 *   ERR_PACKAGE_PATH_NOT_EXPORTED. Per override: read the packument, take
 *   the latest stable release of each major inside
 *   socket.upstreamCompatRange, list each tarball's shipped .js files, and
 *   assert the override resolves both the extension-ful and extensionless
 *   specifier for every one (or every literal exports key when the upstream
 *   major ships its own map). Network legs run ONLY under --online (the
 *   weekly job); the default tier reports an explicit skip rather than a
 *   silent green. Usage: node
 *   scripts/repo/check/override-surface-covers-upstream-majors.mts
 *   [--online] [--only <upstream-name>] [--quiet]
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { gunzipSync } from 'node:zlib'

import {
  httpJson,
  httpRequest,
  HttpResponseError,
} from '@socketsecurity/lib-stable/http-request'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { resolveOriginalPackageName } from '@socketsecurity/lib-stable/packages/normalize'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'
import semver from 'semver'

import { isMainModule } from '../../fleet/_shared/is-main-module.mts'
import { NPM_PACKAGES_PATH } from '../constants/paths.mts'
import { resolveExportsSubpath } from '../util/exports-resolver.mts'
import { errorMessage } from '@socketsecurity/lib-stable/errors/message'

const logger = getDefaultLogger()

const REGISTRY_BASE = 'https://registry.npmjs.org'

interface DeviationEntry {
  pattern: string
  reason: string
}

// The documented not-served subpaths live beside this check, per the
// allowlist-in-a-config-file convention.
const DEVIATIONS: Record<string, DeviationEntry[]> = JSON.parse(
  readFileSync(
    path.join(import.meta.dirname, 'override-surface-deviations.json'),
    'utf8',
  ),
)

export function isDeviated(pkgName: string, subpath: string): boolean {
  const entries = DEVIATIONS[pkgName]
  if (!Array.isArray(entries)) {
    return false
  }
  for (let i = 0, { length } = entries; i < length; i += 1) {
    const { pattern } = entries[i]!
    if (pattern.endsWith('*')) {
      if (subpath.startsWith(pattern.slice(0, -1))) {
        return true
      }
    } else if (subpath === pattern) {
      return true
    }
  }
  return false
}

export interface SurfaceGap {
  major: number
  pkgName: string
  reason: string
  subpath: string
  upstreamVersion: string
}

export interface SurfaceCheckOptions {
  only?: string | undefined
  online?: boolean | undefined
  quiet?: boolean | undefined
}

// Names of every regular file inside a registry tarball, `package/` prefix
// stripped. Plain ustar walk: name at offset 0-99, size in octal at 124-135,
// data rounded up to 512-byte blocks.
export function listTarballFiles(tarball: Buffer): string[] {
  const tar = gunzipSync(tarball)
  const files: string[] = []
  let offset = 0
  while (offset + 512 <= tar.length) {
    const name = tar
      .subarray(offset, offset + 100)
      .toString('utf8')
      .replace(/\0.*$/, '')
    if (!name) {
      break
    }
    const size = Number.parseInt(
      tar
        .subarray(offset + 124, offset + 136)
        .toString('utf8')
        .replace(/\0.*$/, '')
        .trim(),
      8,
    )
    const typeflag = tar[offset + 156]
    // '0' or NUL is a regular file.
    if (typeflag === 0x30 || typeflag === 0) {
      files.push(name.replace(/^package\//, ''))
    }
    offset += 512 + Math.ceil((Number.isNaN(size) ? 0 : size) / 512) * 512
  }
  return files
}

// The specifiers a consumer can legally require against ONE upstream release:
// every exports key when the release ships a map, otherwise both forms of
// every shipped .js file.
export function legalSubpathsFor(
  files: readonly string[],
  upstreamExports: unknown,
): string[] {
  if (upstreamExports && typeof upstreamExports === 'object') {
    return Object.keys(upstreamExports as Record<string, unknown>).filter(
      key => key.startsWith('.') && !key.includes('*'),
    )
  }
  const out = new Set<string>(['.'])
  for (let i = 0, { length } = files; i < length; i += 1) {
    const file = files[i]!
    // A package's own test and example files are not consumer surface even
    // when the tarball ships them, as old-school upstreams did.
    if (
      !file.endsWith('.js') ||
      file === 'test.js' ||
      file === 'tests.js' ||
      file.endsWith('.test.js') ||
      file.endsWith('.spec.js') ||
      file.startsWith('test/') ||
      file.startsWith('tests/') ||
      file.startsWith('example/') ||
      file.startsWith('examples/')
    ) {
      continue
    }
    out.add(`./${file}`)
    out.add(`./${file.slice(0, -3)}`)
  }
  return [...out]
}

export function findSurfaceGaps(
  overrideDir: string,
  pkgName: string,
  major: number,
  upstreamVersion: string,
  legalSubpaths: readonly string[],
): SurfaceGap[] {
  const manifest = JSON.parse(
    readFileSync(path.join(overrideDir, 'package.json'), 'utf8'),
  ) as { exports?: Record<string, unknown> | undefined }
  const exportsField = manifest.exports
  const gaps: SurfaceGap[] = []
  for (let i = 0, { length } = legalSubpaths; i < length; i += 1) {
    const subpath = legalSubpaths[i]!
    if (!exportsField || typeof exportsField !== 'object') {
      continue
    }
    if (isDeviated(pkgName, subpath)) {
      continue
    }
    const target = resolveExportsSubpath(exportsField, subpath)
    if (target === undefined) {
      gaps.push({
        major,
        pkgName,
        reason: 'not resolvable through the override exports map',
        subpath,
        upstreamVersion,
      })
    } else if (!existsSync(path.join(overrideDir, target))) {
      gaps.push({
        major,
        pkgName,
        reason: `resolves to missing ${target}`,
        subpath,
        upstreamVersion,
      })
    }
  }
  return gaps
}

async function fetchJson(url: string): Promise<unknown> {
  return await httpJson(url)
}

async function auditOverride(pkgDir: string): Promise<SurfaceGap[]> {
  const dirName = path.basename(pkgDir)
  const upstreamName = resolveOriginalPackageName(dirName)
  const manifest = JSON.parse(
    readFileSync(path.join(pkgDir, 'package.json'), 'utf8'),
  ) as { socket?: { upstreamCompatRange?: string | undefined } | undefined }
  const compatRange = manifest.socket?.upstreamCompatRange
  const packument = (await fetchJson(
    `${REGISTRY_BASE}/${upstreamName.replace('/', '%2f')}`,
  )) as {
    versions?: Record<
      string,
      { dist?: { tarball?: string | undefined }; exports?: unknown }
    >
  }
  const versions = Object.keys(packument.versions ?? {}).filter(
    v => !v.includes('-') && (!compatRange || semver.satisfies(v, compatRange)),
  )
  const latestPerMajor = new Map<number, string>()
  for (let i = 0, { length } = versions; i < length; i += 1) {
    const version = versions[i]!
    const major = semver.major(version)
    const seen = latestPerMajor.get(major)
    if (!seen || semver.gt(version, seen)) {
      latestPerMajor.set(major, version)
    }
  }
  const gaps: SurfaceGap[] = []
  for (const [major, version] of latestPerMajor) {
    const meta = packument.versions?.[version]
    const tarballUrl = meta?.dist?.tarball
    if (!tarballUrl) {
      continue
    }
    let body: Buffer
    try {
      const res = await httpRequest(tarballUrl)
      if (res.status === 404) {
        // A tarball the registry itself cannot serve is uninstallable by any
        // consumer, so it carries no surface to cover.
        continue
      }
      if (!res.ok) {
        throw new Error(`GET ${tarballUrl} failed: HTTP ${res.status}`)
      }
      body = Buffer.from(await res.arrayBuffer())
    } catch (e) {
      if (e instanceof HttpResponseError && e.status === 404) {
        continue
      }
      throw e
    }
    const files = listTarballFiles(body)
    const legal = legalSubpathsFor(files, meta?.exports)
    gaps.push(...findSurfaceGaps(pkgDir, upstreamName, major, version, legal))
  }
  return gaps
}

export async function runSurfaceCheck(
  options?: SurfaceCheckOptions | undefined,
): Promise<number> {
  const opts = { __proto__: null, ...options } as SurfaceCheckOptions
  if (!opts.online) {
    logger.info(
      'override-surface-covers-upstream-majors: SKIPPED (online-only) - 0 packages checked, NOT a pass. Run with --online (the weekly job does).',
    )
    return 0
  }
  const dirs = readdirSync(NPM_PACKAGES_PATH)
    .toSorted()
    .filter(d => !opts.only || resolveOriginalPackageName(d) === opts.only)
  const allGaps: SurfaceGap[] = []
  const failures: string[] = []
  await pEach(
    dirs,
    async dir => {
      try {
        allGaps.push(
          ...(await auditOverride(path.join(NPM_PACKAGES_PATH, dir))),
        )
      } catch (e) {
        failures.push(`${dir}: ${errorMessage(e)}`)
      }
    },
    { concurrency: 8 },
  )
  if (allGaps.length === 0 && failures.length === 0) {
    if (!opts.quiet) {
      logger.success(
        `override-surface-covers-upstream-majors: ${dirs.length} overrides cover every supported upstream major's surface.`,
      )
    }
    return 0
  }
  logger.fail(
    [
      `override-surface-covers-upstream-majors: ${allGaps.length} surface gap(s), ${failures.length} fetch failure(s).`,
      ...allGaps.map(
        g =>
          `  ${g.pkgName}@${g.upstreamVersion} (major ${g.major}): ${g.subpath} - ${g.reason}`,
      ),
      ...failures.map(f => `  fetch: ${f}`),
      '  Wanted: every specifier legal against a supported upstream major',
      '  resolves through the override exports map to a shipped file.',
      '  Fix: extend the override exports map or add the missing file; for a',
      '  different-library major, declare socket.upstreamCompatRange instead.',
    ].join('\n'),
  )
  return 1
}

/* c8 ignore start - entrypoint guard; the pure legs are covered directly. */
if (isMainModule(import.meta.url)) {
  const onlyIndex = process.argv.indexOf('--only')
  runSurfaceCheck({
    only: onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1],
    online: process.argv.includes('--online'),
    quiet: process.argv.includes('--quiet'),
  })
    .then(code => {
      process.exitCode = code
    })
    .catch((e: unknown) => {
      logger.fail(
        `override-surface-covers-upstream-majors failed: ${String(e)}`,
      )
      process.exitCode = 1
    })
}
/* c8 ignore stop */
