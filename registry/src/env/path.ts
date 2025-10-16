/**
 * PATH environment variable snapshot.
 * System executable search paths.
 */

import { env } from 'node:process'

export const PATH = env['PATH']
