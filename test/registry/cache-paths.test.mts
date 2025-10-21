import { getPacoteCachePath } from '@socketsecurity/lib/constants/packages'
import { describe, expect, it } from 'vitest'

const pacoteCachePath = getPacoteCachePath()

describe('package manager cache paths', () => {
  it('should export pacoteCachePath as string', () => {
    expect(typeof pacoteCachePath).toBe('string')
  })

  it('should contain expected keyword when path is set', () => {
    if (pacoteCachePath) {
      expect(pacoteCachePath.toLowerCase()).toContain('_cacache')
    }
  })

  it('should not contain backslashes in normalized path', () => {
    if (pacoteCachePath) {
      expect(pacoteCachePath).not.toContain('\\')
    }
  })
})
