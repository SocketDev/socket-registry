/**
 * SOCKET_CLI_OPTIMIZE environment variable snapshot.
 * Controls Socket CLI optimization mode.
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const SOCKET_CLI_OPTIMIZE = envAsBoolean(env['SOCKET_CLI_OPTIMIZE'])
