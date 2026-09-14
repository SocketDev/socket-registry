import { describe, expect, it } from 'vitest'

import { encodeNpmRegistryName } from '../../../../scripts/repo/util/npm-registry-name.mts'

describe('encodeNpmRegistryName', () => {
  it('preserves the leading scope marker and encodes the path', () => {
    expect(encodeNpmRegistryName('@example/package name')).toBe(
      '@example%2Fpackage%20name',
    )
  })

  it('encodes unscoped names as path segments', () => {
    expect(encodeNpmRegistryName('package name')).toBe('package%20name')
  })
})
