/**
 * @fileoverview Check a Socket package against the firewall API
 * before downloading its tarball directly from the npm registry.
 *
 * Endpoint: GET https://firewall-api.socket.dev/purl/<encoded-purl>
 * Response: { alerts?: [{ severity?, type?, key? }, ...] }
 *
 * Exits 0 if the package is OK to install (no critical/high alerts,
 * or the firewall is unreachable — non-fatal so a network blip
 * doesn't break the bootstrap).
 *
 * Exits 1 if the firewall reports a blocking alert
 * (severity: critical | high).
 *
 * Usage:
 *   node check-firewall.mts <package-name> <version>
 */

import { argv, exit, stderr, stdout } from 'node:process'

const pkgName = argv[2]
const version = argv[3]
if (!pkgName || !version) {
  stderr.write(
    'Usage: node check-firewall.mts <package-name> <version>\n',
  )
  exit(2)
}

const FIREWALL_API_URL = 'https://firewall-api.socket.dev/purl'
const FIREWALL_TIMEOUT_MS = 10_000
const BLOCK_SEVERITIES = new Set(['critical', 'high'])

const purl = `pkg:npm/${pkgName}@${version}`
const url = `${FIREWALL_API_URL}/${encodeURIComponent(purl)}`

interface Alert {
  severity?: string
  type?: string
  key?: string
}
interface FirewallResponse {
  alerts?: Alert[]
}

const main = async (): Promise<number> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FIREWALL_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'socket-registry-install-action/1.0',
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      stderr.write(
        `firewall-api: HTTP ${res.status} for ${purl} — proceeding anyway (non-fatal)\n`,
      )
      return 0
    }
    const data = (await res.json()) as FirewallResponse
    const blocking = (data.alerts ?? []).filter(
      a => typeof a.severity === 'string' && BLOCK_SEVERITIES.has(a.severity),
    )
    if (blocking.length > 0) {
      stderr.write(
        `\n✗ Socket Firewall BLOCKED ${pkgName}@${version} (${blocking.length} alert(s)):\n`,
      )
      for (const a of blocking.slice(0, 10)) {
        stderr.write(
          `    ${a.severity}: ${a.type ?? a.key ?? 'unknown'}\n`,
        )
      }
      stderr.write(
        '\nFix: bump the pinned version in pnpm-workspace.yaml or package.json.\n',
      )
      return 1
    }
    stdout.write(`✓ ${pkgName}@${version} cleared by Socket Firewall\n`)
    return 0
  } catch (e) {
    clearTimeout(timer)
    // Firewall errors are non-fatal — allow bootstrap to proceed.
    // Network blips or registry-down shouldn't break a fresh clone.
    stderr.write(
      `firewall-api: ${e instanceof Error ? e.message : String(e)} — proceeding anyway (non-fatal)\n`,
    )
    return 0
  }
}

main().then(code => exit(code))
