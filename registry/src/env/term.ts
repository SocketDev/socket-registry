/**
 * TERM environment variable snapshot.
 * Terminal type identifier.
 */

import { env } from 'node:process'

export const TERM = env['TERM']
