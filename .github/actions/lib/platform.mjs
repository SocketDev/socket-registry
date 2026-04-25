/**
 * @fileoverview Prints the canonical Socket platform string for this runner.
 *
 * Output: linux-x64, linux-arm64, linux-x64-musl, linux-arm64-musl,
 * darwin-x64, darwin-arm64, win-x64, win-arm64.
 *
 * Replaces the uname + ldd dance repeated across action steps. Node
 * gives us platform/arch directly, and `process.report` exposes libc
 * (glibcVersionRuntime is the string "musl" on musl Node, otherwise
 * a glibc version number). No shelling out.
 *
 * Usage: node .github/actions/lib/platform.mjs
 * Exits non-zero on unsupported platform/arch.
 */

import { existsSync, readdirSync } from 'node:fs'

const archMap = { __proto__: null, x64: 'x64', arm64: 'arm64' }
const platformMap = {
  __proto__: null,
  linux: 'linux',
  darwin: 'darwin',
  win32: 'win',
}

const arch = archMap[process.arch]
const platform = platformMap[process.platform]

if (!arch || !platform) {
  console.error(`× unsupported runner: ${process.platform}-${process.arch}`)
  process.exit(1)
}

let suffix = ''
if (platform === 'linux') {
  const libc = process.report?.getReport().header.glibcVersionRuntime
  if (libc === 'musl') {
    suffix = '-musl'
  } else if (!libc) {
    // glibcVersionRuntime undefined on Linux is unusual — confirm
    // libc by probing for the musl dynamic loader. Both /lib/ld-musl-*
    // and /lib64/ld-musl-* are valid musl ABI paths.
    const probeDirs = ['/lib', '/lib64']
    const isMusl = probeDirs.some(d => {
      if (!existsSync(d)) {
        return false
      }
      try {
        return readdirSync(d).some(f => f.startsWith('ld-musl-'))
      } catch {
        return false
      }
    })
    if (isMusl) {
      suffix = '-musl'
    }
  }
}

console.log(`${platform}-${arch}${suffix}`)
