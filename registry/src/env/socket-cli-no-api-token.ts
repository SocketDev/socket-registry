/**
 * SOCKET_CLI_NO_API_TOKEN environment variable snapshot.
 * Whether to skip Socket CLI API token requirement (alternative name).
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const SOCKET_CLI_NO_API_TOKEN = envAsBoolean(
  env['SOCKET_CLI_NO_API_TOKEN'],
)
