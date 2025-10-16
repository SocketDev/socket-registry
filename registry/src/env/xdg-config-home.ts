/**
 * XDG_CONFIG_HOME environment variable snapshot.
 * XDG Base Directory specification config directory.
 */

import { env } from 'node:process'

export const XDG_CONFIG_HOME = env['XDG_CONFIG_HOME']
