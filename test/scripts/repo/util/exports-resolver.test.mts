import { describe, expect, it } from 'vitest'

import { resolveExportsSubpath } from '../../../../scripts/repo/util/exports-resolver.mts'

describe('resolveExportsSubpath', () => {
  it('substitutes every target wildcard', () => {
    expect(
      resolveExportsSubpath({ './*': './dist/*/fallback/*.js' }, './feature'),
    ).toBe('./dist/feature/fallback/feature.js')
  })
})
