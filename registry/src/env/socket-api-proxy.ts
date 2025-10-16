/**
 * SOCKET_API_PROXY environment variable snapshot.
 * Proxy URL for Socket Security API requests.
 */

import { env } from 'node:process'

export const SOCKET_API_PROXY = env['SOCKET_API_PROXY']
