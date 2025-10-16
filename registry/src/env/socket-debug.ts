/**
 * SOCKET_DEBUG environment variable snapshot.
 * Controls Socket-specific debug output.
 */

import { env } from 'node:process'

export const SOCKET_DEBUG = env['SOCKET_DEBUG']
