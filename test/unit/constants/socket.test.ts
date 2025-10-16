/**
 * @fileoverview Tests for Socket.dev constants.
 *
 * Validates Socket APIs, scopes, organizations, and application names.
 */
import { describe, expect, it } from 'vitest'

import {
  CACHE_SOCKET_API_DIR,
  REGISTRY,
  REGISTRY_SCOPE_DELIMITER,
  SOCKET_API_BASE_URL,
  SOCKET_APP_PREFIX,
  SOCKET_CLI_APP_NAME,
  SOCKET_DLX_APP_NAME,
  SOCKET_FIREWALL_APP_NAME,
  SOCKET_GITHUB_ORG,
  SOCKET_IPC_HANDSHAKE,
  SOCKET_OVERRIDE_SCOPE,
  SOCKET_PUBLIC_API_KEY,
  SOCKET_PUBLIC_API_TOKEN,
  SOCKET_REGISTRY_APP_NAME,
  SOCKET_REGISTRY_NPM_ORG,
  SOCKET_REGISTRY_PACKAGE_NAME,
  SOCKET_REGISTRY_REPO_NAME,
  SOCKET_REGISTRY_SCOPE,
  SOCKET_SECURITY_SCOPE,
} from '../../../registry/dist/constants/socket.js'

describe('socket constants', () => {
  describe('Socket.dev API', () => {
    it('should have API base URL', () => {
      expect(SOCKET_API_BASE_URL).toBe('https://api.socket.dev/v0')
    })

    it('should have public API key', () => {
      expect(typeof SOCKET_PUBLIC_API_KEY).toBe('string')
      expect(SOCKET_PUBLIC_API_KEY).toMatch(/^sktsec_/)
    })

    it('should have backward compatible API token', () => {
      expect(SOCKET_PUBLIC_API_TOKEN).toBe(SOCKET_PUBLIC_API_KEY)
    })
  })

  describe('Socket.dev scopes', () => {
    it('should have npm scopes', () => {
      expect(SOCKET_REGISTRY_SCOPE).toBe('@socketregistry')
      expect(SOCKET_SECURITY_SCOPE).toBe('@socketsecurity')
      expect(SOCKET_OVERRIDE_SCOPE).toBe('@socketoverride')
    })
  })

  describe('Socket.dev organization', () => {
    it('should have GitHub organization', () => {
      expect(SOCKET_GITHUB_ORG).toBe('SocketDev')
    })

    it('should have repository name', () => {
      expect(SOCKET_REGISTRY_REPO_NAME).toBe('socket-registry')
    })

    it('should have package name', () => {
      expect(SOCKET_REGISTRY_PACKAGE_NAME).toBe('@socketsecurity/registry')
    })

    it('should have npm organization', () => {
      expect(SOCKET_REGISTRY_NPM_ORG).toBe('socketregistry')
    })
  })

  describe('Socket.dev application names', () => {
    it('should have app names', () => {
      expect(SOCKET_CLI_APP_NAME).toBe('socket')
      expect(SOCKET_DLX_APP_NAME).toBe('dlx')
      expect(SOCKET_FIREWALL_APP_NAME).toBe('sfw')
      expect(SOCKET_REGISTRY_APP_NAME).toBe('registry')
    })

    it('should have app prefix', () => {
      expect(SOCKET_APP_PREFIX).toBe('_')
    })
  })

  describe('Socket.dev IPC', () => {
    it('should have IPC handshake', () => {
      expect(SOCKET_IPC_HANDSHAKE).toBe('SOCKET_IPC_HANDSHAKE')
    })
  })

  describe('Socket.dev cache and registry', () => {
    it('should have cache directory name', () => {
      expect(CACHE_SOCKET_API_DIR).toBe('socket-api')
    })

    it('should have registry name', () => {
      expect(REGISTRY).toBe('registry')
    })

    it('should have scope delimiter', () => {
      expect(REGISTRY_SCOPE_DELIMITER).toBe('__')
    })
  })
})
