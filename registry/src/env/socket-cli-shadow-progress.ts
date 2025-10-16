/**
 * SOCKET_CLI_SHADOW_PROGRESS environment variable snapshot.
 * Controls Socket CLI shadow mode progress display.
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const SOCKET_CLI_SHADOW_PROGRESS = envAsBoolean(
  env['SOCKET_CLI_SHADOW_PROGRESS'],
)
