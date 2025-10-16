/**
 * HOME environment variable snapshot.
 * Points to the user's home directory.
 */

import { env } from 'node:process'

export const HOME = env['HOME']
