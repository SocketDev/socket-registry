/**
 * DEBUG environment variable snapshot.
 * Controls debug output for the debug package.
 */

import { env } from 'node:process'

export const DEBUG = env['DEBUG']
