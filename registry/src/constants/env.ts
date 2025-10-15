/**
 * Environment variable configuration with centralized access.
 * This module provides controlled access to environment variables.
 */

import { env } from 'node:process'

// Helper functions for type conversion.
export function envAsBoolean(value: string | undefined): boolean {
  if (!value) {
    return false
  }
  const lower = value.toLowerCase()
  return lower === 'true' || lower === '1' || lower === 'yes'
}

export function envAsNumber(value: string | undefined): number {
  if (!value) {
    return 0
  }
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

export function envAsString(value: string | undefined): string {
  return value || ''
}

// Create a proxy for environment variable access.
const envProxy = new Proxy(
  {},
  {
    get(_, prop) {
      if (typeof prop === 'string') {
        return env[prop]
      }
      return undefined
    },

    has(_, prop) {
      if (typeof prop === 'string') {
        return prop in env
      }
      return false
    },
  },
)

// Environment getters for common variables.
export function getNodeEnv(): string {
  return envAsString(env['NODE_ENV']) || 'production'
}

export function isProduction(): boolean {
  return getNodeEnv() === 'production'
}

export function isDevelopment(): boolean {
  return getNodeEnv() === 'development'
}

export function isTest(): boolean {
  const nodeEnv = getNodeEnv()
  return nodeEnv === 'test' || !!env['VITEST'] || !!env['JEST_WORKER_ID']
}

export function isCI(): boolean {
  return envAsBoolean(env['CI'])
}

export function getNodeAuthToken(): string | undefined {
  return env['NODE_AUTH_TOKEN']
}

export function getNpmToken(): string | undefined {
  return env['NPM_TOKEN']
}

export function getNpmConfigUserAgent(): string | undefined {
  return env['npm_config_user_agent']
}

export function getNpmRegistry(): string | undefined {
  return env['NPM_REGISTRY'] || env['npm_config_registry']
}

export function getPath(): string {
  return envAsString(env['PATH'])
}

export function getHome(): string | undefined {
  return env['HOME'] || env['USERPROFILE']
}

export function getTemp(): string | undefined {
  return env['TMPDIR'] || env['TEMP'] || env['TMP']
}

export function getShell(): string | undefined {
  return env['SHELL'] || env['COMSPEC']
}

export function getTerm(): string | undefined {
  return env['TERM']
}

export function getLocale(): string {
  return env['LANG'] || env['LC_ALL'] || env['LC_MESSAGES'] || 'en_US.UTF-8'
}

export function getGithubToken(): string | undefined {
  return env['GITHUB_TOKEN']
}

export function getGithubServerUrl(): string {
  return envAsString(env['GITHUB_SERVER_URL']) || 'https://github.com'
}

export function getGithubApiUrl(): string {
  return envAsString(env['GITHUB_API_URL']) || 'https://api.github.com'
}

export function getGithubRepository(): string | undefined {
  return env['GITHUB_REPOSITORY']
}

export function getGithubRefName(): string | undefined {
  return env['GITHUB_REF_NAME']
}

export function getGithubRefType(): string | undefined {
  return env['GITHUB_REF_TYPE']
}

export function getGithubBaseRef(): string | undefined {
  return env['GITHUB_BASE_REF']
}

// Socket-specific environment variables.
export function getSocketApiToken(): string | undefined {
  return env['SOCKET_API_TOKEN'] || env['SOCKET_CLI_API_TOKEN']
}

export function getSocketApiBaseUrl(): string | undefined {
  return env['SOCKET_API_BASE_URL'] || env['SOCKET_CLI_API_BASE_URL']
}

export function getSocketApiProxy(): string | undefined {
  return env['SOCKET_API_PROXY'] || env['SOCKET_CLI_API_PROXY']
}

export function getSocketApiTimeout(): number {
  return envAsNumber(env['SOCKET_API_TIMEOUT'] || env['SOCKET_CLI_API_TIMEOUT'])
}

export function getSocketOrgSlug(): string | undefined {
  return env['SOCKET_ORG_SLUG'] || env['SOCKET_CLI_ORG_SLUG']
}

export function getSocketHome(): string | undefined {
  return env['SOCKET_HOME']
}

export function getSocketRegistryUrl(): string | undefined {
  return env['SOCKET_REGISTRY_URL'] || env['SOCKET_NPM_REGISTRY']
}

export function getSocketConfig(): string | undefined {
  return env['SOCKET_CONFIG'] || env['SOCKET_CLI_CONFIG']
}

export function getSocketAcceptRisks(): boolean {
  return envAsBoolean(
    env['SOCKET_ACCEPT_RISKS'] || env['SOCKET_CLI_ACCEPT_RISKS'],
  )
}

export function getSocketViewAllRisks(): boolean {
  return envAsBoolean(
    env['SOCKET_VIEW_ALL_RISKS'] || env['SOCKET_CLI_VIEW_ALL_RISKS'],
  )
}

export function getSocketNoApiToken(): boolean {
  return envAsBoolean(
    env['SOCKET_NO_API_TOKEN'] || env['SOCKET_CLI_NO_API_TOKEN'],
  )
}

// Pre-commit environment.
export function isPreCommit(): boolean {
  return envAsBoolean(env['PRE_COMMIT'])
}

// XDG environment.
export function getXdgDataHome(): string | undefined {
  return env['XDG_DATA_HOME']
}

export function getXdgConfigHome(): string | undefined {
  return env['XDG_CONFIG_HOME']
}

export function getXdgCacheHome(): string | undefined {
  return env['XDG_CACHE_HOME']
}

// Export the ENV proxy for backward compatibility.
// This maintains the same interface as the old constants.ENV.
const ENV = Object.freeze({
  __proto__: null,
  ...envProxy,
  // Add commonly accessed properties as getters.
  get NODE_ENV() {
    return getNodeEnv()
  },
  get CI() {
    return isCI()
  },
  get NODE_AUTH_TOKEN() {
    return getNodeAuthToken()
  },
  get NPM_TOKEN() {
    return getNpmToken()
  },
  get GITHUB_TOKEN() {
    return getGithubToken()
  },
  get SOCKET_API_TOKEN() {
    return getSocketApiToken()
  },
  get SOCKET_API_BASE_URL() {
    return getSocketApiBaseUrl()
  },
  // Add other properties on-demand...
})

export default ENV
