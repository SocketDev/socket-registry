/**
 * SOCKET_CLI_ACCEPT_RISKS environment variable snapshot.
 * Whether to accept all Socket CLI risks (alternative name).
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const SOCKET_CLI_ACCEPT_RISKS = envAsBoolean(
  env['SOCKET_CLI_ACCEPT_RISKS'],
)
