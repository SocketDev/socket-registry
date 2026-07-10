// vitest specs for scripts/fleet/util/multi-package-publish.mts — drives
// `stageMultiPackagePublish()` end to end against a fake `gh` on PATH (real
// `tar` extracts a real fixture tarball). Covers the socket-btm binsuite
// release shape (date-shortsha version, checksums.txt manifest, raw
// extension-less per-triplet binaries) alongside a regression case proving
// the default semver + tarball row (socket-addon's NAPI shape) resolves
// exactly as before.

import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'
import { afterEach, beforeEach, describe, test } from 'vitest'

import { stageMultiPackagePublish } from '../../../scripts/fleet/util/multi-package-publish.mts'
import {
  buildBinaryPathInTail,
  buildTailPackageName,
} from '../../../scripts/fleet/util/source-allowlist.mts'
import type { SourceAllowlistEntry } from '../../../scripts/fleet/util/source-allowlist.mts'

let workDir: string
let originalPath: string | undefined

function sha256Of(filePath: string): string {
  return crypto
    .createHash('sha256')
    .update(readFileSync(filePath))
    .digest('hex')
}

// The lib-stable spawn helper caches a resolved binary's absolute path per
// command name (`spawnBinPathCache`) for the life of the process, keyed off
// the FIRST successful PATH lookup — reusing a fresh `mkdtemp` dir per test
// would mint a new `gh` absolute path each time and get silently ignored once
// cached. Writing every test's shim to this one fixed path keeps the cache
// entry valid while still swapping the script's behavior per test.
const ghShimDirPath = mkdtempSync(
  path.join(os.tmpdir(), 'multi-package-publish-ghshim-'),
)
const ghShimPath = path.join(ghShimDirPath, 'gh')

/**
 * (Re)write the fake `gh` on PATH: `release download` copies every file out
 * of `assetsDir` into the requested `--dir`; `attestation verify` always
 * succeeds. Exercises the pipeline without a network dependency.
 */
function writeGhShim(assetsDir: string): void {
  const script = `#!/bin/sh
case "$1 $2" in
  "release download")
    OUTDIR=""
    while [ $# -gt 0 ]; do
      if [ "$1" = "--dir" ]; then
        OUTDIR="$2"
      fi
      shift
    done
    cp ${JSON.stringify(assetsDir)}/* "$OUTDIR"/
    exit 0
    ;;
  "attestation verify")
    exit 0
    ;;
esac
exit 1
`
  writeFileSync(ghShimPath, script)
  chmodSync(ghShimPath, 0o755)
}

beforeEach(() => {
  workDir = mkdtempSync(path.join(os.tmpdir(), 'multi-package-publish-'))
  originalPath = process.env['PATH']
  process.env['PATH'] = `${ghShimDirPath}${path.delimiter}${originalPath ?? ''}`
})

afterEach(async () => {
  process.env['PATH'] = originalPath
  await safeDelete(workDir, { force: true })
})

describe('stageMultiPackagePublish', () => {
  test('regression: a default semver + tarball row (napi kind) resolves exactly as before', async () => {
    const entry: SourceAllowlistEntry = {
      attestationSubject:
        'https://github.com/SocketDev/ultrathink/.github/workflows/build-rust.yml@refs/tags/acorn-rust-*',
      binaryName: 'acorn',
      familyId: 'acorn-rust',
      kind: 'napi',
      namePrefix: 'acorn-rust-',
      sourceRepo: 'SocketDev/ultrathink',
      tagPattern: /^acorn-rust-\d+\.\d+\.\d+$/,
      targetScope: '@socketaddon',
      triplets: ['darwin-arm64'],
      workflowPath: '.github/workflows/build-rust.yml',
    }
    const tailName = buildTailPackageName(entry, 'darwin-arm64')

    // Build the tarball fixture: package.json + acorn.node at the archive root.
    const sourceDir = path.join(workDir, 'tarball-source')
    mkdirSync(sourceDir, { recursive: true })
    writeFileSync(
      path.join(sourceDir, 'package.json'),
      JSON.stringify({ name: tailName, version: '0.0.0' }),
    )
    writeFileSync(path.join(sourceDir, 'acorn.node'), 'NAPI-BINARY-BYTES')

    const assetsDir = path.join(workDir, 'assets')
    mkdirSync(assetsDir, { recursive: true })
    const archiveName = 'acorn-rust-darwin-arm64.tgz'
    const archivePath = path.join(assetsDir, archiveName)
    const tarResult = spawnSync('tar', [
      '-czf',
      archivePath,
      '-C',
      sourceDir,
      '.',
    ])
    assert.equal(tarResult.status, 0, 'fixture tar failed')
    writeFileSync(
      path.join(assetsDir, 'SHA256SUMS'),
      `${sha256Of(archivePath)}  ${archiveName}\n`,
    )

    const tailDir = path.join(workDir, 'tail')
    mkdirSync(tailDir, { recursive: true })
    writeFileSync(
      path.join(tailDir, 'package.json'),
      JSON.stringify({ name: tailName, version: '0.0.0' }),
    )

    writeGhShim(assetsDir)

    const result = await stageMultiPackagePublish({
      allowlist: [entry],
      binaryPathInTail: triplet => buildBinaryPathInTail(entry, triplet),
      releaseTag: 'acorn-rust-1.2.3',
      sourceRepo: entry.sourceRepo,
      stagingDir: path.join(workDir, 'staging'),
      tailDirFor: () => tailDir,
    })

    assert.equal(result.version, '1.2.3')
    assert.equal(result.tails.length, 1)
    assert.equal(result.tails[0]!.tailName, tailName)
    assert.equal(
      readFileSync(path.join(tailDir, 'acorn.node'), 'utf8'),
      'NAPI-BINARY-BYTES',
    )
    const stagedManifest = JSON.parse(
      readFileSync(path.join(tailDir, 'package.json'), 'utf8'),
    ) as { version: string }
    assert.equal(stagedManifest.version, '1.2.3')
  })

  test('binsuite shape: date-shortsha version + checksums.txt + raw per-triplet binaries', async () => {
    const entry: SourceAllowlistEntry = {
      attestationSubject:
        'https://github.com/SocketDev/socket-btm/.github/workflows/release.yml@refs/tags/binflate-*',
      binaryName: 'binflate',
      checksumsAsset: 'checksums.txt',
      familyId: 'binflate',
      kind: 'cli',
      namePrefix: 'binflate-',
      sourceRepo: 'SocketDev/socket-btm',
      tagPattern: /^binflate-\d{8}-[0-9a-f]+$/,
      targetScope: '@socketbin',
      triplets: ['darwin-arm64', 'win32-x64'],
      versionScheme: 'date-shortsha',
      workflowPath: '.github/workflows/release.yml',
    }

    const assetsDir = path.join(workDir, 'assets')
    mkdirSync(assetsDir, { recursive: true })
    const darwinAsset = 'binflate-darwin-arm64'
    const win32Asset = 'binflate-win32-x64.exe'
    writeFileSync(path.join(assetsDir, darwinAsset), 'DARWIN-ARM64-BYTES')
    writeFileSync(path.join(assetsDir, win32Asset), 'WIN32-X64-BYTES')
    writeFileSync(
      path.join(assetsDir, 'checksums.txt'),
      [
        `${sha256Of(path.join(assetsDir, darwinAsset))}  ${darwinAsset}`,
        `${sha256Of(path.join(assetsDir, win32Asset))}  ${win32Asset}`,
      ].join('\n'),
    )

    const tailDirs = new Map<string, string>()
    for (const triplet of entry.triplets) {
      const tailDir = path.join(workDir, `tail-${triplet}`)
      mkdirSync(tailDir, { recursive: true })
      writeFileSync(
        path.join(tailDir, 'package.json'),
        JSON.stringify({
          name: buildTailPackageName(entry, triplet),
          version: '0.0.0',
        }),
      )
      tailDirs.set(triplet, tailDir)
    }

    writeGhShim(assetsDir)

    const result = await stageMultiPackagePublish({
      allowlist: [entry],
      binaryPathInTail: triplet => buildBinaryPathInTail(entry, triplet),
      releaseTag: 'binflate-20260507-f1e66a5',
      sourceRepo: entry.sourceRepo,
      stagingDir: path.join(workDir, 'staging'),
      tailDirFor: triplet => tailDirs.get(triplet)!,
    })

    assert.equal(result.version, '20260507.0.0-f1e66a5')
    assert.equal(result.tails.length, 2)

    const darwinTailDir = tailDirs.get('darwin-arm64')!
    const stagedDarwinBinary = path.join(darwinTailDir, 'bin', 'binflate')
    assert.equal(readFileSync(stagedDarwinBinary, 'utf8'), 'DARWIN-ARM64-BYTES')
    if (process.platform !== 'win32') {
      assert.ok(
        (statSync(stagedDarwinBinary).mode & 0o111) !== 0,
        'expected the executable bit',
      )
    }

    const win32TailDir = tailDirs.get('win32-x64')!
    const stagedWin32Binary = path.join(win32TailDir, 'bin', 'binflate.exe')
    assert.ok(existsSync(stagedWin32Binary))
    assert.equal(readFileSync(stagedWin32Binary, 'utf8'), 'WIN32-X64-BYTES')
  })
})
