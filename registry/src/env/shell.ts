/**
 * SHELL environment variable snapshot.
 * Unix/macOS default shell path.
 */

import { env } from 'node:process'

export const SHELL = env['SHELL']
