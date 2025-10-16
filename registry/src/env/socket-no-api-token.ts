/**
 * SOCKET_NO_API_TOKEN environment variable snapshot.
 * Whether to skip Socket Security API token requirement.
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const SOCKET_NO_API_TOKEN = envAsBoolean(env['SOCKET_NO_API_TOKEN'])
