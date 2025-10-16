/**
 * LANG environment variable snapshot.
 * System locale and language settings.
 */

import { env } from 'node:process'

export const LANG = env['LANG']
