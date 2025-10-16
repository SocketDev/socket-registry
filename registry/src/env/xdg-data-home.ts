/**
 * XDG_DATA_HOME environment variable snapshot.
 * Points to the user's data directory on Unix systems (XDG Base Directory specification).
 */

import { env } from 'node:process'

export const XDG_DATA_HOME = env['XDG_DATA_HOME']
