/**
 * COMSPEC environment variable snapshot.
 * Windows command interpreter path.
 */

import { env } from 'node:process'

export const COMSPEC = env['COMSPEC']
