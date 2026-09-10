import { describe, expect, it } from 'vitest'

import * as registry from '../registry/src/index.js'
import manifest from '../registry/manifest.json' with { type: 'json' }

describe('@socketsecurity/registry current source', () => {
  it('returns the complete manifest without an ecosystem', () => {
    expect(registry.getManifestData()).toEqual(manifest)
  })

  it('returns the complete npm ecosystem entries', () => {
    expect(registry.getManifestData('npm')).toEqual(manifest.npm)
  })

  it('returns the requested package metadata without its purl tuple', () => {
    expect(registry.getManifestData('npm', 'is-string')).toMatchObject({
      name: '@socketregistry/is-string',
      package: 'is-string',
      license: 'MIT',
    })
  })

  it('returns undefined for a missing package in an existing ecosystem', () => {
    expect(
      registry.getManifestData('npm', 'nonexistent-package'),
    ).toBeUndefined()
  })

  it.each(['nonexistent', 'constructor', '__proto__', 'toString'])(
    'returns undefined for the unknown ecosystem %s',
    ecosystem => {
      expect(registry.getManifestData(ecosystem)).toBeUndefined()
      expect(registry.getManifestData(ecosystem, 'is-string')).toBeUndefined()
    },
  )
})
