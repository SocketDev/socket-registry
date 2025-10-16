/**
 * SOCKET_CONFIG environment variable snapshot.
 * Socket Security configuration file path.
 */

import { env } from 'node:process'

export const SOCKET_CONFIG = env['SOCKET_CONFIG']
