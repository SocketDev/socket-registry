/**
 * TEMP environment variable snapshot.
 * Windows temporary directory path.
 */

import { env } from 'node:process'

export const TEMP = env['TEMP']
