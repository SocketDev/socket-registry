/** @fileoverview Tests for package provenance checking functionality. */
import { describe, expect, it } from 'vitest'

import {
  fetchPackageProvenance,
  getProvenanceDetails,
} from '../../registry/dist/lib/packages.js'

describe('fetchPackageProvenance', () => {
  it('should be defined and exported', () => {
    expect(typeof fetchPackageProvenance).toBe('function')
  })

  it('should export getProvenanceDetails helper', () => {
    expect(typeof getProvenanceDetails).toBe('function')
  })

  it('should handle getProvenanceDetails with empty attestations', () => {
    const rawData = {
      attestations: [],
      attestationCount: 0,
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBe(undefined)
  })

  it('should handle getProvenanceDetails with non-array attestations', () => {
    const rawData = {
      attestations: 'not an array',
      attestationCount: 0,
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBe(undefined)
  })

  it('should handle getProvenanceDetails with missing attestations property', () => {
    const rawData = {
      attestationCount: 0,
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBe(undefined)
  })

  it('should handle getProvenanceDetails with SLSA v0.2 provenance', () => {
    const rawData = {
      attestations: [
        {
          predicateType: 'https://slsa.dev/provenance/v0.2',
          predicate: {
            buildDefinition: {
              externalParameters: {
                workflow: { path: '.github/workflows/release.yml' },
              },
            },
          },
        },
      ],
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBeDefined()
    expect(result?.level).toBe('attested')
  })

  it('should handle getProvenanceDetails with SLSA v1.0 provenance', () => {
    const rawData = {
      attestations: [
        {
          predicateType: 'https://slsa.dev/provenance/v1',
          predicate: {
            buildDefinition: {
              externalParameters: {
                workflow: { path: '.github/workflows/release.yml' },
              },
            },
          },
        },
      ],
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBeDefined()
    expect(result?.level).toBe('attested')
  })

  it('should handle getProvenanceDetails with GitHub trusted publisher', () => {
    const rawData = {
      attestations: [
        {
          predicateType: 'https://slsa.dev/provenance/v1',
          predicate: {
            buildDefinition: {
              buildType: 'https://github.com/actions',
              externalParameters: {
                workflow: {
                  repository: 'https://github.com/user/repo',
                  ref: 'refs/heads/main',
                },
              },
            },
            runDetails: {
              builder: {
                id: 'https://github.com/actions/runner',
              },
            },
          },
        },
      ],
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBeDefined()
    expect(result?.level).toBe('trusted')
    expect(result?.workflowPlatform).toBe('https://github.com/actions')
  })

  it('should handle getProvenanceDetails with GitLab trusted publisher', () => {
    const rawData = {
      attestations: [
        {
          predicateType: 'https://slsa.dev/provenance/v1',
          predicate: {
            buildDefinition: {
              buildType: 'https://gitlab.com',
              externalParameters: {
                workflow: {
                  repository: 'https://gitlab.com/user/repo',
                  ref: 'refs/heads/main',
                },
              },
            },
            runDetails: {
              builder: {
                id: 'https://gitlab.com/gitlab-org/gitlab-runner',
              },
            },
          },
        },
      ],
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBeDefined()
    expect(result?.level).toBe('trusted')
    expect(result?.workflowPlatform).toBe('https://gitlab.com')
  })

  it('should handle getProvenanceDetails with DSSE envelope payload', () => {
    const statement = {
      predicate: {
        buildDefinition: {
          externalParameters: {
            workflow: { path: '.github/workflows/test.yml' },
          },
        },
      },
    }
    const payload = Buffer.from(JSON.stringify(statement)).toString('base64')

    const rawData = {
      attestations: [
        {
          predicateType: 'https://slsa.dev/provenance/v1',
          bundle: {
            dsseEnvelope: {
              payload,
            },
          },
        },
      ],
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBeDefined()
    expect(result?.level).toBe('attested')
  })

  it('should handle getProvenanceDetails with invalid DSSE envelope payload', () => {
    const rawData = {
      attestations: [
        {
          predicateType: 'https://slsa.dev/provenance/v1',
          bundle: {
            dsseEnvelope: {
              payload: 'invalid-base64!!!',
            },
          },
        },
      ],
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBeDefined()
    expect(result?.level).toBe('attested')
  })

  it('should handle getProvenanceDetails with malformed predicate', () => {
    const rawData = {
      attestations: [
        {
          predicateType: 'https://slsa.dev/provenance/v1',
          predicate: {
            buildDefinition: {
              // Missing externalParameters
            },
          },
        },
      ],
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBeDefined()
    expect(result?.level).toBe('attested')
  })

  it('should extract workflow details from externalParameters', () => {
    const rawData = {
      attestations: [
        {
          predicateType: 'https://slsa.dev/provenance/v1',
          predicate: {
            buildDefinition: {
              externalParameters: {
                workflow: {
                  ref: 'refs/heads/main',
                  repository: 'https://github.com/user/repo',
                },
                context: 'https://github.com/user/repo/actions/runs/12345',
                run_id: '12345',
                ref: 'refs/tags/v1.0.0',
                sha: 'abc123def456',
              },
            },
          },
        },
      ],
    }

    const result = getProvenanceDetails(rawData)
    expect(result).toBeDefined()
    expect(result?.workflowRef).toBe('refs/heads/main')
    expect(result?.gitRef).toBe('refs/tags/v1.0.0')
    expect(result?.repository).toBe('https://github.com/user/repo')
    expect(result?.workflowUrl).toBe(
      'https://github.com/user/repo/actions/runs/12345',
    )
    expect(result?.workflowRunId).toBe('12345')
    expect(result?.commitSha).toBe('abc123def456')
  })

  it('should return undefined when package does not exist', async () => {
    // Test with a package that doesn't exist
    const result = await fetchPackageProvenance(
      'non-existent-package-that-should-never-exist-12345',
      '1.0.0',
      undefined,
    )

    expect(result).toBe(undefined)
  })

  it('should handle scoped package names correctly', async () => {
    // Test with a scoped package that doesn't exist
    const result = await fetchPackageProvenance(
      '@non-existent/package-12345',
      '1.0.0',
      undefined,
    )

    expect(result).toBe(undefined)
  })

  it('should handle version strings with special characters', async () => {
    // Test with version containing special characters
    const result = await fetchPackageProvenance(
      'non-existent-package-12345',
      '1.0.0-beta.1',
      undefined,
    )

    expect(result).toBe(undefined)
  })

  it('should handle abort signal', async () => {
    const controller = new AbortController()
    controller.abort()

    const result = await fetchPackageProvenance('test-package', '1.0.0', {
      signal: controller.signal,
    })

    expect(result).toBe(undefined)
  })

  it('should handle timeout option', async () => {
    // Test with a very short timeout that will likely timeout
    const result = await fetchPackageProvenance(
      'test-package-timeout',
      '1.0.0',
      {
        // 1ms timeout should cause abort
        timeout: 1,
      },
    )

    expect(result).toBe(undefined)
  })

  it('should return undefined for network errors', async () => {
    // This will test the actual network error handling by using an invalid URL
    // The function should catch the error and return undefined
    const result = await fetchPackageProvenance('', '1.0.0', undefined)

    expect(result).toBe(undefined)
  })

  it('should handle URLs with special characters in package names and versions', async () => {
    // Test URL encoding by using a scoped package with special characters
    const result = await fetchPackageProvenance(
      '@test/package-with+special-chars',
      '1.0.0-alpha+beta',
      undefined,
    )

    // Should handle the URL encoding internally and return undefined for non-existent package
    expect(result).toBe(undefined)
  })

  it('should handle very long timeouts gracefully', async () => {
    // Test with a long timeout to ensure timeout handling works
    const result = await fetchPackageProvenance(
      'non-existent-package-test',
      '1.0.0',
      {
        // 30 second timeout
        timeout: 30_000,
      },
    )

    expect(result).toBe(undefined)
  })

  it('should handle package names with maximum lengths', async () => {
    // Test with very long package name (npm allows up to 214 characters)
    const longPackageName = 'a'.repeat(200)
    const result = await fetchPackageProvenance(
      longPackageName,
      '1.0.0',
      undefined,
    )

    expect(result).toBe(undefined)
  })

  it('should handle concurrent requests properly', async () => {
    // Test multiple concurrent requests to ensure proper isolation
    const promises = [
      fetchPackageProvenance('test-package-1', '1.0.0', undefined),
      fetchPackageProvenance('test-package-2', '2.0.0', undefined),
      fetchPackageProvenance('test-package-3', '3.0.0', undefined),
    ]

    const results = await Promise.all(promises)

    results.forEach(result => {
      if (result !== undefined) {
        expect(result).toHaveProperty('level')
        expect(['trusted', 'attested']).toContain(result.level)
      }
    })
  })

  it('should properly encode package names with slashes and at symbols', async () => {
    // Test proper URL encoding of special characters
    const result = await fetchPackageProvenance(
      '@scope/package-name',
      '1.0.0',
      undefined,
    )

    expect(result).toBe(undefined)
  })

  it('should handle different versions format correctly', async () => {
    // Test with different version formats
    const testCases = [
      '1.0.0',
      '1.0.0-alpha',
      '1.0.0-beta.1',
      '1.0.0-rc.1+build.1',
      '0.0.1-dev',
    ]

    for (const version of testCases) {
      // eslint-disable-next-line no-await-in-loop
      const result = await fetchPackageProvenance(
        'test-package-versions',
        version,
        undefined,
      )

      if (result !== undefined) {
        expect(result).toHaveProperty('level')
        expect(['trusted', 'attested']).toContain(result.level)
      }
    }
  })

  it('should maintain consistent behavior across multiple calls', async () => {
    // Test consistency by making the same request multiple times
    const packageName = 'consistency-test-package'
    const version = '1.0.0'

    const results = await Promise.all([
      fetchPackageProvenance(packageName, version, undefined),
      fetchPackageProvenance(packageName, version, undefined),
      fetchPackageProvenance(packageName, version, undefined),
    ])

    // All results should be identical
    expect(results[0]).toEqual(results[1])
    expect(results[1]).toEqual(results[2])
  })

  it('should include provenance details when available', async () => {
    // Test the structure of the returned object when provenance exists
    // This is a mock test since we can't guarantee real packages with provenance
    const result = await fetchPackageProvenance(
      'test-package',
      '1.0.0',
      undefined,
    )

    if (result !== undefined) {
      expect(result).toHaveProperty('level')
      expect(['trusted', 'attested']).toContain(result.level)

      // Optional properties should be string or undefined
      if (result.repository !== undefined) {
        expect(typeof result.repository).toBe('string')
      }
      if (result.workflowRef !== undefined) {
        expect(typeof result.workflowRef).toBe('string')
      }
      if (result.workflowUrl !== undefined) {
        expect(typeof result.workflowUrl).toBe('string')
      }
      if (result.workflowPlatform !== undefined) {
        expect(typeof result.workflowPlatform).toBe('string')
      }
      if (result.workflowRunId !== undefined) {
        expect(typeof result.workflowRunId).toBe('string')
      }
      if (result.gitRef !== undefined) {
        expect(typeof result.gitRef).toBe('string')
      }
      if (result.commitSha !== undefined) {
        expect(typeof result.commitSha).toBe('string')
      }
    }
  })

  // Real integration test with a package that has provenance (if any exists)
  it.skip('should detect provenance for packages that have it (integration test)', async () => {
    // This test is skipped by default as it requires network access
    // and a real package with provenance. Uncomment and update with a real
    // package if you want to test against the actual npm registry.
    // Example: const result = await fetchPackageProvenance('@actions/core', '1.10.0')
    // expect(result?.level).toBe('trusted') // or 'attested'
    // expect(result?.repository).toBeDefined()
    // expect(result?.workflowUrl).toBeDefined()
  })
})
