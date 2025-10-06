import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the httpRequest module before importing sea-build module.
vi.mock('../../registry/dist/lib/http-request.js', () => {
  return {
    httpRequest: vi.fn(),
  }
})

import { httpRequest as httpRequestActual } from '../../registry/dist/lib/http-request.js'
import {
  getBuildTargets,
  getDefaultNodeVersion,
  getLatestCurrentRelease,
} from '../../registry/dist/lib/sea-build.js'

const httpRequest = httpRequestActual as unknown as ReturnType<typeof vi.fn>

describe('sea-build module', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getDefaultNodeVersion', () => {
    it('should return env var when set', async () => {
      process.env['SOCKET_SEA_NODE_VERSION'] = '22.0.0'
      const version = await getDefaultNodeVersion()
      expect(version).toBe('22.0.0')
    })

    it('should fetch latest when env var not set', async () => {
      delete process.env['SOCKET_SEA_NODE_VERSION']

      httpRequest.mockResolvedValue({
        body: Buffer.from(
          JSON.stringify([
            { version: 'v24.8.0' },
            { version: 'v23.0.0' },
            { version: 'v22.0.0' },
          ]),
        ),
        headers: {},
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      const version = await getDefaultNodeVersion()
      expect(version).toBe('24.8.0')
    })
  })

  describe('getLatestCurrentRelease', () => {
    it('should fetch and parse latest even-numbered version', async () => {
      httpRequest.mockResolvedValue({
        body: Buffer.from(
          JSON.stringify([
            { version: 'v26.1.0' },
            { version: 'v25.0.0' },
            { version: 'v24.8.0' },
            { version: 'v23.0.0' },
            { version: 'v22.0.0' },
          ]),
        ),
        headers: {},
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      const version = await getLatestCurrentRelease()
      expect(version).toBe('26.1.0')
    })

    it('should filter out odd-numbered versions', async () => {
      httpRequest.mockResolvedValue({
        body: Buffer.from(
          JSON.stringify([
            { version: 'v25.0.0' },
            { version: 'v24.8.0' },
            { version: 'v23.0.0' },
          ]),
        ),
        headers: {},
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      const version = await getLatestCurrentRelease()
      expect(version).toBe('24.8.0')
    })

    it('should filter out versions below v24', async () => {
      httpRequest.mockResolvedValue({
        body: Buffer.from(
          JSON.stringify([
            { version: 'v22.0.0' },
            { version: 'v20.0.0' },
            { version: 'v18.0.0' },
          ]),
        ),
        headers: {},
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      const version = await getLatestCurrentRelease()
      expect(version).toBe('24.8.0')
    })

    it('should fallback to 24.8.0 when no suitable version found', async () => {
      httpRequest.mockResolvedValue({
        body: Buffer.from(
          JSON.stringify([{ version: 'v21.0.0' }, { version: 'v19.0.0' }]),
        ),
        headers: {},
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      const version = await getLatestCurrentRelease()
      expect(version).toBe('24.8.0')
    })

    it('should throw error on fetch failure', async () => {
      httpRequest.mockResolvedValue({
        body: Buffer.from(''),
        headers: {},
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(getLatestCurrentRelease()).rejects.toThrow('Failed to fetch')
    })

    it('should throw error on network error', async () => {
      httpRequest.mockRejectedValue(new Error('Network error'))

      await expect(getLatestCurrentRelease()).rejects.toThrow(
        'Failed to fetch latest Node.js Current release',
      )
    })

    it('should handle invalid version format', async () => {
      httpRequest.mockResolvedValue({
        body: Buffer.from(
          JSON.stringify([{ version: 'invalid' }, { version: 'v24.8.0' }]),
        ),
        headers: {},
        ok: true,
        status: 200,
        statusText: 'OK',
      })

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
