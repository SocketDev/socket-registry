/**
 * SOCKET_VIEW_ALL_RISKS environment variable snapshot.
 * Whether to view all Socket Security risks.
 */

import { env } from 'node:process'

import { envAsBoolean } from '#env/helpers'

export const SOCKET_VIEW_ALL_RISKS = envAsBoolean(env['SOCKET_VIEW_ALL_RISKS'])
