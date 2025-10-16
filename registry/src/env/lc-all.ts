/**
 * LC_ALL environment variable snapshot.
 * Override for all locale settings.
 */

import { env } from 'node:process'

export const LC_ALL = env['LC_ALL']
