/**
 * SOCKET_ACCEPT_RISKS environment variable snapshot.
 * Whether to accept all Socket Security risks.
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const SOCKET_ACCEPT_RISKS = envAsBoolean(env['SOCKET_ACCEPT_RISKS'])
