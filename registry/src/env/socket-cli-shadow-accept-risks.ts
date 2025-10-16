/**
 * SOCKET_CLI_SHADOW_ACCEPT_RISKS environment variable snapshot.
 * Controls Socket CLI shadow mode risk acceptance.
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const SOCKET_CLI_SHADOW_ACCEPT_RISKS = envAsBoolean(
  env['SOCKET_CLI_SHADOW_ACCEPT_RISKS'],
)
