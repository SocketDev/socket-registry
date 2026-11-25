interface PackageMaintainer {
  name?: string | undefined
  email?: string | undefined
}

export interface PackageInfo {
  name: string
  version: string
  maintainers?: Array<PackageMaintainer | string> | undefined
  repository?: { url?: string | undefined } | undefined
  dist?: { attestations?: unknown | undefined } | undefined
}

export function collectPackageTrustDetails(
  info: PackageInfo,
  allowedMaintainers: ReadonlySet<string>,
  issues: string[],
  successes: string[],
): void {
  // Check if maintainers include expected Socket accounts
  const maintainers = info.maintainers || []
  const maintainerStrings = maintainers.map((m: PackageMaintainer | string) => {
    if (typeof m === 'string') {
      return m
    }
    return m.name && m.email ? `${m.name} <${m.email}>` : String(m)
  })

  const hasAllowedMaintainers =
    maintainerStrings.length > 0 &&
    maintainerStrings.every(m => allowedMaintainers.has(m))

  if (!hasAllowedMaintainers) {
    issues.push(`Unexpected maintainers: ${maintainerStrings.join(', ')}`)
  } else {
    successes.push(`Maintainers: ${maintainerStrings.join(', ')}`)
  }

  // Check repository field
  const repository = info.repository
  if (!repository || !repository.url) {
    issues.push('No repository URL configured')
  } else if (!repository.url.includes('SocketDev')) {
    issues.push(`Repository not under SocketDev org: ${repository.url}`)
  } else {
    successes.push(`Repository: ${repository.url}`)
  }

  // Check for npm provenance (trusted publishing)
  const dist = info.dist
  if (dist?.attestations) {
    successes.push('Trusted-published with npm provenance')
  } else {
    issues.push('Not trusted-published (missing provenance)')
  }
}
