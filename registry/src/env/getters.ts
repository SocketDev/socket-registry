/**
 * @fileoverview Environment variable getter functions.
 * Provides convenient getter functions that wrap env module constants.
 */

import { CI } from '#env/ci'
import { DEBUG } from '#env/debug'
import { GITHUB_API_URL } from '#env/github-api-url'
import { GITHUB_BASE_REF } from '#env/github-base-ref'
import { GITHUB_REF_NAME } from '#env/github-ref-name'
import { GITHUB_REF_TYPE } from '#env/github-ref-type'
import { GITHUB_REPOSITORY } from '#env/github-repository'
import { GITHUB_SERVER_URL } from '#env/github-server-url'
import { GITHUB_TOKEN } from '#env/github-token'
import { envAsString } from '#env/helpers'
import { HOME } from '#env/home'
import { JEST_WORKER_ID } from '#env/jest-worker-id'
import { LANG } from '#env/lang'
import { LC_ALL } from '#env/lc-all'
import { LC_MESSAGES } from '#env/lc-messages'
import { NODE_AUTH_TOKEN } from '#env/node-auth-token'
import { NODE_ENV } from '#env/node-env'
import { npm_config_registry } from '#env/npm-config-registry'
import { npm_config_user_agent } from '#env/npm-config-user-agent'
import { npm_lifecycle_event } from '#env/npm-lifecycle-event'
import { NPM_REGISTRY } from '#env/npm-registry'
import { NPM_TOKEN } from '#env/npm-token'
import { PATH } from '#env/path'
import { PRE_COMMIT } from '#env/pre-commit'
import { SHELL } from '#env/shell'
import { SOCKET_ACCEPT_RISKS } from '#env/socket-accept-risks'
import { SOCKET_API_BASE_URL } from '#env/socket-api-base-url'
import { SOCKET_API_PROXY } from '#env/socket-api-proxy'
import { SOCKET_API_TIMEOUT } from '#env/socket-api-timeout'
import { SOCKET_API_TOKEN } from '#env/socket-api-token'
import { SOCKET_CLI_ACCEPT_RISKS } from '#env/socket-cli-accept-risks'
import { SOCKET_CLI_API_BASE_URL } from '#env/socket-cli-api-base-url'
import { SOCKET_CLI_API_PROXY } from '#env/socket-cli-api-proxy'
import { SOCKET_CLI_API_TIMEOUT } from '#env/socket-cli-api-timeout'
import { SOCKET_CLI_API_TOKEN } from '#env/socket-cli-api-token'
import { SOCKET_CLI_CONFIG } from '#env/socket-cli-config'
import { SOCKET_CLI_NO_API_TOKEN } from '#env/socket-cli-no-api-token'
import { SOCKET_CLI_ORG_SLUG } from '#env/socket-cli-org-slug'
import { SOCKET_CLI_VIEW_ALL_RISKS } from '#env/socket-cli-view-all-risks'
import { SOCKET_CONFIG } from '#env/socket-config'
import { SOCKET_DEBUG } from '#env/socket-debug'
import { SOCKET_HOME } from '#env/socket-home'
import { SOCKET_NO_API_TOKEN } from '#env/socket-no-api-token'
import { SOCKET_NPM_REGISTRY } from '#env/socket-npm-registry'
import { SOCKET_ORG_SLUG } from '#env/socket-org-slug'
import { SOCKET_REGISTRY_URL } from '#env/socket-registry-url'
import { SOCKET_VIEW_ALL_RISKS } from '#env/socket-view-all-risks'
import { TEMP } from '#env/temp'
import { TERM } from '#env/term'
import { TMP } from '#env/tmp'
import { TMPDIR } from '#env/tmpdir'
import { USERPROFILE } from '#env/userprofile'
import { VITEST } from '#env/vitest'
import { XDG_CACHE_HOME } from '#env/xdg-cache-home'
import { XDG_CONFIG_HOME } from '#env/xdg-config-home'
import { XDG_DATA_HOME } from '#env/xdg-data-home'

export function getNodeEnv(): string {
  return envAsString(NODE_ENV) || 'production'
}

export function isProduction(): boolean {
  return getNodeEnv() === 'production'
}

export function isDevelopment(): boolean {
  return getNodeEnv() === 'development'
}

export function isTest(): boolean {
  const nodeEnv = getNodeEnv()
  return nodeEnv === 'test' || !!VITEST || !!JEST_WORKER_ID
}

export function isCI(): boolean {
  return CI
}

export function getNodeAuthToken(): string | undefined {
  return NODE_AUTH_TOKEN
}

export function getNpmToken(): string | undefined {
  return NPM_TOKEN
}

export function getNpmConfigUserAgent(): string | undefined {
  return npm_config_user_agent
}

export function getNpmRegistry(): string | undefined {
  return NPM_REGISTRY || npm_config_registry
}

export function getPath(): string {
  return envAsString(PATH)
}

export function getHome(): string | undefined {
  return HOME || USERPROFILE
}

export function getTemp(): string | undefined {
  return TMPDIR || TEMP || TMP
}

export function getShell(): string | undefined {
  return SHELL
}

export function getTerm(): string | undefined {
  return TERM
}

export function getLocale(): string {
  return LANG || LC_ALL || LC_MESSAGES || 'en_US.UTF-8'
}

export function getGithubToken(): string | undefined {
  return GITHUB_TOKEN
}

export function getGithubServerUrl(): string {
  return envAsString(GITHUB_SERVER_URL) || 'https://github.com'
}

export function getGithubApiUrl(): string {
  return envAsString(GITHUB_API_URL) || 'https://api.github.com'
}

export function getGithubRepository(): string | undefined {
  return GITHUB_REPOSITORY
}

export function getGithubRefName(): string | undefined {
  return GITHUB_REF_NAME
}

export function getGithubRefType(): string | undefined {
  return GITHUB_REF_TYPE
}

export function getGithubBaseRef(): string | undefined {
  return GITHUB_BASE_REF
}

export function getSocketApiToken(): string | undefined {
  return SOCKET_API_TOKEN || SOCKET_CLI_API_TOKEN
}

export function getSocketApiBaseUrl(): string | undefined {
  return SOCKET_API_BASE_URL || SOCKET_CLI_API_BASE_URL
}

export function getSocketApiProxy(): string | undefined {
  return SOCKET_API_PROXY || SOCKET_CLI_API_PROXY
}

export function getSocketApiTimeout(): number {
  return SOCKET_API_TIMEOUT || SOCKET_CLI_API_TIMEOUT
}

export function getSocketOrgSlug(): string | undefined {
  return SOCKET_ORG_SLUG || SOCKET_CLI_ORG_SLUG
}

export function getSocketHome(): string | undefined {
  return SOCKET_HOME
}

export function getSocketRegistryUrl(): string | undefined {
  return SOCKET_REGISTRY_URL || SOCKET_NPM_REGISTRY
}

export function getSocketConfig(): string | undefined {
  return SOCKET_CONFIG || SOCKET_CLI_CONFIG
}

export function getSocketAcceptRisks(): boolean {
  return SOCKET_ACCEPT_RISKS || SOCKET_CLI_ACCEPT_RISKS
}

export function getSocketViewAllRisks(): boolean {
  return SOCKET_VIEW_ALL_RISKS || SOCKET_CLI_VIEW_ALL_RISKS
}

export function getSocketNoApiToken(): boolean {
  return SOCKET_NO_API_TOKEN || SOCKET_CLI_NO_API_TOKEN
}

export function isPreCommit(): boolean {
  return PRE_COMMIT
}

export function getXdgDataHome(): string | undefined {
  return XDG_DATA_HOME
}

export function getXdgConfigHome(): string | undefined {
  return XDG_CONFIG_HOME
}

export function getXdgCacheHome(): string | undefined {
  return XDG_CACHE_HOME
}

export function getNpmLifecycleEvent(): string | undefined {
  return npm_lifecycle_event
}

export function getDebug(): string | undefined {
  return DEBUG
}

export function getSocketDebug(): string | undefined {
  return SOCKET_DEBUG
}
