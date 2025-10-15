/**
 * Socket.dev APIs, scopes, organizations, and application names.
 */

// Socket.dev API.
export const SOCKET_API_BASE_URL = 'https://api.socket.dev/v0'
export const SOCKET_PUBLIC_API_KEY =
  'sktsec_t_--RAN5U4ivauy4w37-6aoKyYPDt5ZbaT5JBVMqiwKo_api'
// Alias for backward compatibility.
export const SOCKET_PUBLIC_API_TOKEN = SOCKET_PUBLIC_API_KEY

// Socket.dev scopes.
export const SOCKET_REGISTRY_SCOPE = '@socketregistry'
export const SOCKET_SECURITY_SCOPE = '@socketsecurity'
export const SOCKET_OVERRIDE_SCOPE = '@socketoverride'

// Socket.dev organization and repositories.
export const SOCKET_GITHUB_ORG = 'SocketDev'
export const SOCKET_REGISTRY_REPO_NAME = 'socket-registry'
export const SOCKET_REGISTRY_PACKAGE_NAME = '@socketsecurity/registry'
export const SOCKET_REGISTRY_NPM_ORG = 'socketregistry'

// Socket.dev application names.
export const SOCKET_CLI_APP_NAME = 'socket'
export const SOCKET_DLX_APP_NAME = 'dlx'
export const SOCKET_FIREWALL_APP_NAME = 'sfw'
export const SOCKET_REGISTRY_APP_NAME = 'registry'
export const SOCKET_APP_PREFIX = '_'

// Socket.dev IPC.
export const SOCKET_IPC_HANDSHAKE = 'SOCKET_IPC_HANDSHAKE'

// Socket.dev cache and registry.
export const CACHE_SOCKET_API_DIR = 'socket-api'
export const REGISTRY = 'registry'
export const REGISTRY_SCOPE_DELIMITER = '__'
