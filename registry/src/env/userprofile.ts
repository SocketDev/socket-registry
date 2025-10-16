/**
 * USERPROFILE environment variable snapshot.
 * Windows user home directory path.
 */

import { env } from 'node:process'

export const USERPROFILE = env['USERPROFILE']
