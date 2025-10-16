/**
 * XDG_CACHE_HOME environment variable snapshot.
 * XDG Base Directory specification cache directory.
 */

import { env } from 'node:process'

export const XDG_CACHE_HOME = env['XDG_CACHE_HOME']
