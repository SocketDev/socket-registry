import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getBuildTargets,
  getDefaultNodeVersion,
  getLatestCurrentRelease,
} from '../../registry/dist/lib/sea-build.js'

describe('sea-build module', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  describe('getDefaultNodeVersion', () => {
    it('should return env var when set', async () => {
      process.env['SOCKET_SEA_NODE_VERSION'] = '22.0.0'
      const version = await getDefaultNodeVersion()
      expect(version).toBe('22.0.0')
    })

    it('should fetch latest when env var not set', async () => {
      delete process.env['SOCKET_SEA_NODE_VERSION']

      vi.stubGlobal('fetch', async () => ({
        ok: true,
        json: async () => [
          { version: 'v24.8.0' },
          { version: 'v23.0.0' },
          { version: 'v22.0.0' },
        ],
      }))

      const version = await getDefaultNodeVersion()
      expect(version).toBe('24.8.0')
    })
  })

  describe('getLatestCurrentRelease', () => {
    it('should fetch and parse latest even-numbered version', async () => {
      vi.stubGlobal('fetch', async () => ({
        ok: true,
        json: async () => [
          { version: 'v26.1.0' },
          { version: 'v25.0.0' },
          { version: 'v24.8.0' },
          { version: 'v23.0.0' },
          { version: 'v22.0.0' },
        ],
      }))

      const version = await getLatestCurrentRelease()
      expect(version).toBe('26.1.0')
    })

    it('should filter out odd-numbered versions', async () => {
      vi.stubGlobal('fetch', async () => ({
        ok: true,
        json: async () => [
          { version: 'v25.0.0' },
          { version: 'v24.8.0' },
          { version: 'v23.0.0' },
        ],
      }))

      const version = await getLatestCurrentRelease()
      expect(version).toBe('24.8.0')
    })

    it('should filter out versions below v24', async () => {
      vi.stubGlobal('fetch', async () => ({
        ok: true,
        json: async () => [
          { version: 'v22.0.0' },
          { version: 'v20.0.0' },
          { version: 'v18.0.0' },
        ],
      }))

      const version = await getLatestCurrentRelease()
      expect(version).toBe('24.8.0')
    })

    it('should fallback to 24.8.0 when no suitable version found', async () => {
      vi.stubGlobal('fetch', async () => ({
        ok: true,
        json: async () => [{ version: 'v21.0.0' }, { version: 'v19.0.0' }],
      }))

      const version = await getLatestCurrentRelease()
      expect(version).toBe('24.8.0')
    })

    it('should throw error on fetch failure', async () => {
      vi.stubGlobal('fetch', async () => ({
        ok: false,
        statusText: 'Not Found',
      }))

      await expect(getLatestCurrentRelease()).rejects.toThrow('Failed to fetch')
    })

    it('should throw error on network error', async () => {
      vi.stubGlobal('fetch', async () => {
        throw new Error('Network error')
      })

      await expect(getLatestCurrentRelease()).rejects.toThrow(
        'Failed to fetch latest Node.js Current release',
      )
    })

    it('should handle invalid version format', async () => {
      vi.stubGlobal('fetch', async () => ({
        ok: true,
        json: async () => [{ version: 'invalid' }, { version: 'v24.8.0' }],
      }))

      const version = await getLatestCurrentRelease()
      expect(version).toBe('24.8.0')
    })
  })

  describe('getBuildTargets', () => {
    it('should return array of build targets', async () => {
      process.env['SOCKET_SEA_NODE_VERSION'] = '24.0.0'

      const targets = await getBuildTargets()

      expect(Array.isArray(targets)).toBe(true)
      expect(targets.length).toBeGreaterThan(0)
    })

    it('should include all platforms', async () => {
      process.env['SOCKET_SEA_NODE_VERSION'] = '24.0.0'

      const targets = await getBuildTargets()
      const platforms = targets.map(t => t.platform)

      expect(platforms).toContain('win32')
      expect(platforms).toContain('darwin')
      expect(platforms).toContain('linux')
    })

    it('should include arm64 and x64 architectures', async () => {
      process.env['SOCKET_SEA_NODE_VERSION'] = '24.0.0'

      const targets = await getBuildTargets()
      const arches = targets.map(t => t.arch)

      expect(arches).toContain('arm64')
      expect(arches).toContain('x64')
    })

    it('should use default node version', async () => {
      process.env['SOCKET_SEA_NODE_VERSION'] = '25.5.5'

      const targets = await getBuildTargets()

      expect(targets.every(t => t.nodeVersion === '25.5.5')).toBe(true)
    })

    it('should have correct output names', async () => {
      process.env['SOCKET_SEA_NODE_VERSION'] = '24.0.0'

      const targets = await getBuildTargets()
      const outputNames = targets.map(t => t.outputName)

      expect(outputNames).toContain('socket-win-arm64.exe')
      expect(outputNames).toContain('socket-win-x64.exe')
      expect(outputNames).toContain('socket-macos-arm64')
      expect(outputNames).toContain('socket-macos-x64')
      expect(outputNames).toContain('socket-linux-arm64')
      expect(outputNames).toContain('socket-linux-x64')
    })
  })
})
