/**
 * SOCKET_CLI_API_TIMEOUT environment variable snapshot.
 * Timeout in milliseconds for Socket CLI API requests (alternative name).
 */

import { env } from 'node:process'

import { envAsNumber } from '#env/helpers'

export const SOCKET_CLI_API_TIMEOUT = envAsNumber(env['SOCKET_CLI_API_TIMEOUT'])
