/**
 * SOCKET_CLI_VIEW_ALL_RISKS environment variable snapshot.
 * Whether to view all Socket CLI risks (alternative name).
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const SOCKET_CLI_VIEW_ALL_RISKS = envAsBoolean(
  env['SOCKET_CLI_VIEW_ALL_RISKS'],
)
