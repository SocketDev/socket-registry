/**
 * SOCKET_CACACHE_DIR environment variable snapshot.
 * Overrides the default Socket cacache directory location.
 */

import { env } from 'node:process'

export const SOCKET_CACACHE_DIR = env['SOCKET_CACACHE_DIR']
