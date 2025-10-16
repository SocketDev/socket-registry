/**
 * SOCKET_CLI_SHADOW_SILENT environment variable snapshot.
 * Controls Socket CLI shadow mode silent operation.
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const SOCKET_CLI_SHADOW_SILENT = envAsBoolean(
  env['SOCKET_CLI_SHADOW_SILENT'],
)
