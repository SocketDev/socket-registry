/**
 * SOCKET_API_TIMEOUT environment variable snapshot.
 * Timeout in milliseconds for Socket Security API requests.
 */

import { env } from 'node:process'

import { envAsNumber } from '#env/helpers'

export const SOCKET_API_TIMEOUT = envAsNumber(env['SOCKET_API_TIMEOUT'])
